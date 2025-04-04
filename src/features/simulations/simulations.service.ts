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
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import { PollUpdatedEvent } from '../organisations/events/PollUpdated.event'
import { findOrganisationPublicPollBySlugOrId } from '../organisations/organisations.repository'
import type { PublicPollParams } from '../organisations/organisations.validator'
import type { UserParams } from '../users/users.validator'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event'
import {
  batchPollSimulations,
  createPollUserSimulation,
  createUserSimulation,
  fetchPollSimulations,
  fetchUserSimulation,
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
  }: Partial<Awaited<ReturnType<typeof fetchUserSimulation>>>,
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
  const simulation = await createUserSimulation(params, simulationDto)
  const { user } = simulation

  const simulationUpsertedEvent = new SimulationUpsertedEvent({
    newsletters,
    simulation,
    sendEmail,
    origin,
    user,
  })

  EventBus.emit(simulationUpsertedEvent)

  await EventBus.once(simulationUpsertedEvent)

  return simulationToDto(simulation, params.userId)
}

export const fetchSimulations = async (params: UserParams) => {
  const simulations = await fetchUserSimulations(params)

  return simulations.map((s) => simulationToDto(s, params.userId))
}

export const fetchSimulation = async (params: UserSimulationParams) => {
  try {
    const simulation = await fetchUserSimulation(params)

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
    const { poll, simulation, created } = await createPollUserSimulation(
      params,
      simulationDto
    )
    const { user } = simulation
    const { organisation } = poll

    const pollUpdatedEvent = new PollUpdatedEvent({
      poll,
      organisation,
    })

    const simulationUpsertedEvent = new SimulationUpsertedEvent({
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
    return await transaction(async (prismaSession) => {
      const { id } = await findOrganisationPublicPollBySlugOrId(
        { params },
        { session: prismaSession }
      )
      const simulations = await fetchPollSimulations(
        { id, user },
        {
          session: prismaSession,
        }
      )

      return simulations.map((s) => simulationToDto(s, params.userId))
    })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

const MAX_VALUE = 100000

const isValidSimulation = <T>(
  simulation: T & {
    progression: number
    computedResults: JsonValue
    situation: JsonValue
  }
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

const getFunFactValues = async (
  { id, engine }: { id: string; user?: Request['user']; engine?: Engine },
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

  return {
    simulationCount,
    funFactValues,
  }
}

export const getPollFunFacts = async (
  params: { id: string; user?: Request['user']; engine?: Engine },
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

export const fetchPublicPollDashboard = async ({
  params,
  user,
}: {
  params: PublicPollParams
  user?: Request['user']
}) => {
  try {
    return await transaction(async (prismaSession) => {
      const { id } = await findOrganisationPublicPollBySlugOrId(
        { params },
        { session: prismaSession }
      )

      return {
        funFacts: await getPollFunFacts(
          { id, user },
          { session: prismaSession }
        ),
      }
    })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}
