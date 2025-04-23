import type {
  DottedName,
  FunFacts,
  NGCRule,
} from '@incubateur-ademe/nosgestesclimat'
import modelRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import modelFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json'
import type { JsonValue } from '@prisma/client/runtime/library'
import type { Request } from 'express'
import type Engine from 'publicodes'
import { prisma } from '../../adapters/prisma/client'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import { redis } from '../../adapters/redis/client'
import { KEYS } from '../../adapters/redis/constant'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import { PollUpdatedEvent } from '../organisations/events/PollUpdated.event'
import { findOrganisationPublicPollBySlugOrId } from '../organisations/organisations.repository'
import type { PublicPollParams } from '../organisations/organisations.validator'
import type { UserParams } from '../users/users.validator'
import type { SimulationAsyncEvent } from './events/SimulationUpserted.event'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event'
import {
  batchPollSimulations,
  countOrganisationPublicPollSimulations,
  createPollUserSimulation,
  createUserSimulation,
  fetchPollSimulations,
  fetchSimulationById,
  fetchUserSimulations,
} from './simulations.repository'
import type {
  SimulationCreateDto,
  SimulationCreateNewsletterList,
  UserSimulationParams,
} from './simulations.validator'
import { ComputedResultSchema, SituationSchema } from './simulations.validator'
import {
  getSituationDottedNameValue,
  getSituationDottedNameValueWithEngine,
} from './situation/situation.service'

const frRules = modelRules as Record<DottedName, NGCRule | string | null>
const funFactsRules = modelFunFacts as { [k in keyof FunFacts]: DottedName }

const simulationToDto = (
  {
    polls,
    user,
    ...rest
  }: Partial<Awaited<ReturnType<typeof fetchSimulationById>>>,
  connectedUser: string
) => ({
  ...rest,
  polls: polls?.map(({ pollId, poll: { slug } }) => ({ id: pollId, slug })),
  ...(user
    ? { user: user.id === connectedUser ? user : { name: user.name } }
    : {}),
})

export const createSimulation = async ({
  simulationDto,
  newsletters,
  sendEmail,
  params,
  origin,
}: {
  simulationDto: SimulationCreateDto
  newsletters: SimulationCreateNewsletterList
  sendEmail: boolean
  params: UserParams
  origin: string
}) => {
  const { simulation, created, updated } = await transaction((session) =>
    createUserSimulation(params, simulationDto, { session })
  )
  const { user } = simulation

  const simulationUpsertedEvent = new SimulationUpsertedEvent({
    newsletters,
    simulation,
    sendEmail,
    created,
    updated,
    origin,
    user,
  })

  EventBus.emit(simulationUpsertedEvent)

  await EventBus.once(simulationUpsertedEvent)

  return simulationToDto(simulation, params.userId)
}

export const fetchSimulations = async (params: UserParams) => {
  const simulations = await transaction(
    (session) => fetchUserSimulations(params, { session }),
    prisma
  )

  return simulations.map((s) => simulationToDto(s, params.userId))
}

export const fetchSimulation = async (params: UserSimulationParams) => {
  try {
    const simulation = await transaction(
      (session) => fetchSimulationById(params, { session }),
      prisma
    )

    return simulationToDto(simulation, params.userId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Simulation not found')
    }
    throw e
  }
}

export const createPollSimulation = async ({
  origin,
  params,
  simulationDto,
}: {
  origin: string
  params: PublicPollParams
  simulationDto: SimulationCreateDto
}) => {
  try {
    const { poll, simulation, simulationCreated, simulationUpdated, created } =
      await transaction((session) =>
        createPollUserSimulation(params, simulationDto, { session })
      )
    const { user } = simulation
    const { organisation } = poll

    const pollUpdatedEvent = new PollUpdatedEvent({
      poll,
      organisation,
    })

    const simulationUpsertedEvent = new SimulationUpsertedEvent({
      created: simulationCreated,
      updated: simulationUpdated,
      sendEmail: created,
      organisation,
      simulation,
      origin,
      user,
    })

    EventBus.emit(simulationUpsertedEvent).emit(pollUpdatedEvent)

    // @ts-expect-error 2 events different types: TODO fix
    await EventBus.once(simulationUpsertedEvent, pollUpdatedEvent)

    return simulationToDto(simulation, params.userId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

export const fetchPublicPollSimulations = async ({
  params,
  user,
}: {
  params: PublicPollParams
  user?: Request['user']
}) => {
  try {
    return await transaction(async (session) => {
      const { id } = await findOrganisationPublicPollBySlugOrId(
        { params },
        { session }
      )

      const simulationsCount = await countOrganisationPublicPollSimulations(
        { id },
        { session }
      )

      if (simulationsCount > 500) {
        throw new ForbiddenException(`Cannot fetch more than 500 simulations`)
      }

      const simulations = await fetchPollSimulations(
        { id, user },
        {
          session,
        }
      )

      return simulations.map((s) => simulationToDto(s, params.userId))
    }, prisma)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

const MAX_VALUE = 100000

const isValidSimulation = <T>(
  simulation: T &
    (
      | {
          progression: number
          computedResults: JsonValue
          situation: JsonValue
        }
      | SimulationAsyncEvent
    )
): simulation is T & {
  progression: number
  computedResults: ComputedResultSchema
  situation: SituationSchema
} => {
  if (simulation.progression !== 1) {
    return false
  }

  const computedResults = ComputedResultSchema.safeParse(
    simulation.computedResults
  )

  const situation = SituationSchema.safeParse(simulation.situation)

  if (computedResults.error || situation.error) {
    return false
  }

  return [
    computedResults.data.carbone.bilan,
    ...Object.values(computedResults.data.carbone.categories),
  ].every((v) => v <= MAX_VALUE)
}

const computeAllFunFactValues = async (
  { id, engine }: { id: string; engine?: Engine },
  { session }: { session: Session }
) => {
  let simulationCount = 0
  const funFactValues: { [key in DottedName]?: number } = {}
  for await (const simulation of batchPollSimulations({ id }, { session })) {
    if (!isValidSimulation(simulation)) {
      continue
    }
    simulationCount++

    const { situation } = simulation

    Object.values(funFactsRules).reduce((acc, dottedName) => {
      if (dottedName in frRules) {
        acc[dottedName] =
          (acc[dottedName] || 0) +
          (engine
            ? getSituationDottedNameValueWithEngine({
                dottedName,
                situation,
                engine,
              })
            : getSituationDottedNameValue({
                dottedName,
                situation,
                rules: frRules,
              }))
      }
      return acc
    }, funFactValues)
  }

  return { simulationCount, funFactValues }
}

type RedisPollFunFactsCache = {
  simulationCount: number
  funFactValues: { [key in DottedName]?: number }
}

const getFunFactValues = async (
  {
    id,
    simulation,
    engine,
  }: { id: string; simulation?: SimulationAsyncEvent; engine?: Engine },
  { session }: { session: Session }
) => {
  const redisKey = `${KEYS.pollsFunFactsResults}:${id}`

  let result: RedisPollFunFactsCache | undefined
  if (simulation) {
    const rawPreviousFunFactValues = await redis.get(redisKey)
    if (rawPreviousFunFactValues) {
      result = JSON.parse(rawPreviousFunFactValues) as RedisPollFunFactsCache

      if (isValidSimulation(simulation)) {
        const { situation } = simulation
        result.simulationCount++
        Object.values(funFactsRules).reduce((acc, dottedName) => {
          if (dottedName in frRules) {
            acc[dottedName] =
              (acc[dottedName] || 0) +
              (engine
                ? getSituationDottedNameValueWithEngine({
                    dottedName,
                    situation,
                    engine,
                  })
                : getSituationDottedNameValue({
                    dottedName,
                    situation,
                    rules: frRules,
                  }))
          }
          return acc
        }, result.funFactValues)
      }
    }
  }

  if (!result) {
    result = await computeAllFunFactValues({ id, engine }, { session })
  }

  await redis.set(redisKey, JSON.stringify(result))
  await redis.expire(redisKey, 60 * 60)

  return result
}

export const getPollFunFacts = async (
  params: { id: string; simulation?: SimulationAsyncEvent; engine?: Engine },
  session: { session: Session }
) => {
  const { funFactValues, simulationCount } = await getFunFactValues(
    params,
    session
  )

  return Object.fromEntries(
    Object.entries(funFactsRules).map(([key, dottedName]) => {
      let value = funFactValues[dottedName] || 0

      if (key.startsWith('average')) {
        value = value / simulationCount
      }

      if (key.startsWith('percentage')) {
        value = (value / simulationCount) * 100
      }

      return [key, value]
    })
  ) as FunFacts
}
