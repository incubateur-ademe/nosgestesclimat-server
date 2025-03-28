import type {
  DottedName,
  FunFacts,
  NGCRule,
} from '@incubateur-ademe/nosgestesclimat'
import modelRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import modelFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json'
import type { JsonValue } from '@prisma/client/runtime/library'
import type { Request } from 'express'
import Engine from 'publicodes'
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
import type { Rules } from './situation/situation.service'
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

type FunFactsSimulations = Array<{
  computedResults: ComputedResultSchema
  situation: SituationSchema
}>

const getFunFactValue = ({
  dottedName,
  simulations,
  rules,
}: {
  dottedName: DottedName
  simulations: FunFactsSimulations
  rules: Rules
}): number =>
  simulations.reduce(
    (acc, { situation }) =>
      acc + getSituationDottedNameValue({ dottedName, situation, rules }),
    0
  )

export const getSimulationsFunFacts = (simulations: FunFactsSimulations) => {
  return Object.fromEntries(
    Object.entries(funFactsRules).map(([key, dottedName]) => {
      if (dottedName in frRules) {
        let value = getFunFactValue({ dottedName, simulations, rules: frRules })

        if (key.startsWith('average')) {
          value = value / simulations.length
        }

        if (key.startsWith('percentage')) {
          value = (value / simulations.length) * 100
        }

        return [key, value]
      }
      return [key, 0]
    })
  ) as FunFacts
}

const getFunFactValueWithEngine = ({
  dottedName,
  simulations,
  engine,
}: {
  dottedName: DottedName
  simulations: FunFactsSimulations
  engine: Engine
}): number =>
  simulations.reduce(
    (acc, { situation }) =>
      acc +
      getSituationDottedNameValueWithEngine({ dottedName, situation, engine }),
    0
  )

export const getSimulationsFunFactsWithEngine = (
  simulations: FunFactsSimulations
) => {
  const engine = new Engine(frRules)

  return Object.fromEntries(
    Object.entries(funFactsRules).map(([key, dottedName]) => {
      if (dottedName in frRules) {
        let value = getFunFactValueWithEngine({
          dottedName,
          simulations,
          engine,
        })

        if (key.startsWith('average')) {
          value = value / simulations.length
        }

        if (key.startsWith('percentage')) {
          value = (value / simulations.length) * 100
        }

        return [key, value]
      }
      return [key, 0]
    })
  ) as FunFacts
}

export const fetchPollValidSimulations = async (
  { id, user }: { id: string; user?: Request['user'] },
  { session }: { session: Session }
) => {
  const simulations = await fetchPollSimulations(
    { id, user },
    {
      session,
    }
  )

  return simulations.filter(isValidSimulation)
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

      const simulations = await fetchPollValidSimulations(
        { id, user },
        { session: prismaSession }
      )

      return {
        funFacts: getSimulationsFunFacts(simulations),
      }
    })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}
