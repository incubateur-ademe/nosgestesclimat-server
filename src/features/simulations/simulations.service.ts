import type {
  DottedName,
  FunFacts,
  NGCRule,
} from '@incubateur-ademe/nosgestesclimat'
import modelRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import modelFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json'
import type { JsonValue } from '@prisma/client/runtime/library'
import { engine } from '../../constants/publicode'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import logger from '../../logger'
import { PollUpdatedEvent } from '../organisations/events/PollUpdated.event'
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
  SimulationCreateNewsletterList,
  UserSimulationParams,
} from './simulations.validator'
import {
  ComputedResultSchema,
  SituationSchema,
  type SimulationCreateDto,
} from './simulations.validator'

const rules = modelRules as Record<DottedName, NGCRule | string | null>
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
  params,
  origin,
}: {
  simulationDto: SimulationCreateDto
  newsletters: SimulationCreateNewsletterList
  params: UserParams
  origin: string
}) => {
  const simulation = await createUserSimulation(params, simulationDto)
  const { user } = simulation

  const simulationUpsertedEvent = new SimulationUpsertedEvent({
    newsletters,
    simulation,
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
    const { poll, simulation } = await createPollUserSimulation(
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
}: {
  params: PublicPollParams
}) => {
  try {
    const simulations = await fetchPollSimulations(params)

    return simulations.map((s) => simulationToDto(s, params.userId))
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

const getSituationDottedNameValue = (
  situation: SituationSchema,
  dottedName: DottedName
): number => {
  try {
    engine.setSituation(situation)

    const value = engine.evaluate(dottedName).nodeValue

    if (typeof value === 'number' && !!value) {
      return value
    }

    if (value === true) {
      return 1
    }

    return 0
  } catch (error) {
    logger.error(`Cannot evaluate dottedName ${dottedName}`, {
      situation,
      error,
    })

    return 0
  }
}

const getFunFactValue = (
  dottedName: DottedName,
  simulations: FunFactsSimulations
): number =>
  simulations.reduce(
    (acc, { situation }) =>
      acc + getSituationDottedNameValue(situation, dottedName),
    0
  )

const specialAverageKeys = new Set<string>(<(keyof FunFacts)[]>[
  'averageOfCarKilometers',
  'averageOfTravelers',
  'averageOfElectricityConsumption',
])

const getSimulationsFunFacts = (simulations: FunFactsSimulations) => {
  return Object.fromEntries(
    Object.entries(funFactsRules).map(([key, dottedName]) => {
      if (dottedName in rules) {
        let value = getFunFactValue(dottedName, simulations)

        const rule = rules[dottedName]
        if (
          !!rule &&
          typeof rule === 'object' &&
          specialAverageKeys.has(key) &&
          typeof rule.formule === 'object' &&
          Array.isArray(rule.formule?.moyenne)
        ) {
          const [moyenneDottedName] = rule.formule.moyenne
          if (typeof moyenneDottedName === 'string') {
            const totalAnswers = simulations.reduce(
              (acc, { situation }) =>
                acc + (moyenneDottedName in situation ? 1 : 0),
              0
            )
            if (totalAnswers > 0) {
              value = value / totalAnswers
            }
          }
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

export const fetchPublicPollDashboard = async ({
  params,
}: {
  params: PublicPollParams
}) => {
  try {
    const simulations = await fetchPollSimulations(params)

    const validSimulations = simulations.filter(isValidSimulation)

    return {
      funFacts: getSimulationsFunFacts(validSimulations),
    }
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}
