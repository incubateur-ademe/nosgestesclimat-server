import type {
  DottedName,
  FunFacts,
  NGCRules,
} from '@incubateur-ademe/nosgestesclimat'
import modelRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json' with { type: 'json' }
import modelFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json' with { type: 'json' }
import type { Prisma } from '@prisma/client'
import type { JsonValue } from '@prisma/client/runtime/library'
import dayjs from 'dayjs'
import type { Request } from 'express'
import type Engine from 'publicodes'
import { prisma } from '../../adapters/prisma/client.js'
import type { defaultSimulationSelection } from '../../adapters/prisma/selection.js'
import type { Session } from '../../adapters/prisma/transaction.js'
import { transaction } from '../../adapters/prisma/transaction.js'
import { redis } from '../../adapters/redis/client.js'
import { KEYS } from '../../adapters/redis/constant.js'
import { deepMergeSum } from '../../core/deep-merge.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { ForbiddenException } from '../../core/errors/ForbiddenException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import type { Locales } from '../../core/i18n/constant.js'
import type { PaginationQuery } from '../../core/pagination.js'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError.js'
import { exchangeCredentialsForToken } from '../authentication/authentication.service.js'
import { PollUpdatedEvent } from '../organisations/events/PollUpdated.event.js'
import { findOrganisationPublicPollBySlugOrId } from '../organisations/organisations.repository.js'
import type {
  OrganisationPollCustomAdditionalQuestion,
  PublicPollParams,
} from '../organisations/organisations.validator.js'
import type { UserParams } from '../users/users.validator.js'
import type { SimulationAsyncEvent } from './events/SimulationUpserted.event.js'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event.js'
import { carbonMetric, waterMetric } from './simulation.constant.js'
import {
  batchPollSimulations,
  countOrganisationPublicPollSimulations,
  createPollUserSimulation,
  createUserSimulation,
  fetchPollSimulations,
  fetchSimulationById,
  fetchUserSimulations,
} from './simulations.repository.js'
import type {
  SimulationCreateDto,
  SimulationCreateQuery,
  UserSimulationParams,
} from './simulations.validator.js'
import {
  ComputedResultSchema,
  SituationSchema,
} from './simulations.validator.js'
import {
  getSituationDottedNameValue,
  getSituationDottedNameValueWithEngine,
} from './situation/situation.service.js'

const frRules = modelRules as Partial<NGCRules>
const funFactsRules = modelFunFacts as { [k in keyof FunFacts]: DottedName }

const simulationToDto = (
  {
    verifiedUser,
    polls,
    user,
    ...rest
  }: Partial<
    Prisma.SimulationGetPayload<{ select: typeof defaultSimulationSelection }>
  >,
  connectedUser: string
) => ({
  ...rest,
  polls: polls?.map(({ pollId, poll: { slug } }) => ({ id: pollId, slug })),
  ...(user
    ? { user: user.id === connectedUser ? user : { name: user.name } }
    : {}),
  ...(verifiedUser
    ? {
        user:
          verifiedUser.email === connectedUser
            ? verifiedUser
            : { name: verifiedUser.name },
      }
    : {}),
})

export const createSimulation = async ({
  simulationDto,
  query: { newsletters, sendEmail, code, email, locale },
  params,
  origin,
  user: requestUser,
}: {
  simulationDto: SimulationCreateDto
  query: SimulationCreateQuery
  params: UserParams
  origin: string
  user: Request['user']
}) => {
  let token: string | undefined

  if (code) {
    ;({ token } = await exchangeCredentialsForToken({
      userId: params.userId,
      email,
      code,
    }))
  }

  const { simulation, simulationCreated, simulationUpdated } =
    await transaction((session) =>
      createUserSimulation(
        { ...params, ...(code ? { email } : { email: requestUser?.email }) },
        simulationDto,
        { session }
      )
    )
  const { user, verifiedUser } = simulation

  const simulationUpsertedEvent = new SimulationUpsertedEvent({
    created: simulationCreated,
    updated: simulationUpdated,
    user: verifiedUser || user,
    verified: !!verifiedUser,
    newsletters,
    simulation,
    sendEmail,
    locale,
    origin,
  })

  EventBus.emit(simulationUpsertedEvent)

  await EventBus.once(simulationUpsertedEvent)

  return {
    simulation: simulationToDto(
      simulation,
      email || requestUser?.email || params.userId
    ),
    token,
  }
}

export const fetchSimulations = async ({
  params,
  query,
  user,
}: {
  params: UserParams
  query: PaginationQuery
  user?: Request['user']
}) => {
  const { simulations, count } = await transaction(
    (session) =>
      fetchUserSimulations(
        { ...params, email: user?.email },
        { session, query }
      ),
    prisma
  )

  return {
    simulations: simulations.map((s) =>
      simulationToDto(s, user?.email || params.userId)
    ),
    count,
  }
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
  locale,
  origin,
  params,
  simulationDto,
}: {
  origin: string
  locale: Locales
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
      locale,
      origin,
      poll,
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
        throw new ForbiddenException('Cannot fetch more than 500 simulations')
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

const getEmptyComputedResults = (): ComputedResultSchema => ({
  carbone: {
    bilan: 0,
    categories: {
      'services sociétaux': 0,
      alimentation: 0,
      divers: 0,
      logement: 0,
      transport: 0,
    },
    subcategories: {},
  },
  eau: {
    bilan: 0,
    categories: {
      'services sociétaux': 0,
      alimentation: 0,
      divers: 0,
      logement: 0,
      transport: 0,
    },
    subcategories: {},
  },
})

const mergeComputedResults = (
  computedResults1: ComputedResultSchema,
  computedResults2: ComputedResultSchema
) => {
  return deepMergeSum(
    computedResults1,
    computedResults2
  ) as ComputedResultSchema
}

const computeAllStatValues = async (
  { id, engine }: { id: string; engine?: Engine },
  { session }: { session: Session }
) => {
  let simulationCount = 0
  let computedResults = getEmptyComputedResults()
  const funFactValues: { [key in DottedName]?: number } = {}
  for await (const { simulation } of batchPollSimulations(
    { id },
    { session }
  )) {
    if (!isValidSimulation(simulation)) {
      continue
    }
    simulationCount++

    const { situation } = simulation

    computedResults = mergeComputedResults(
      computedResults,
      simulation.computedResults
    )

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

  return { simulationCount, funFactValues, computedResults }
}

type RedisPollFunFactsCache = {
  simulationCount: number
  funFactValues: { [key in DottedName]?: number }
  computedResults: ComputedResultSchema
}

const getStatValues = async (
  {
    id,
    simulation,
    engine,
  }: { id: string; simulation?: SimulationAsyncEvent; engine?: Engine },
  { session }: { session: Session }
) => {
  const redisKey = `${KEYS.pollsStatsResults}:${id}`

  let result: RedisPollFunFactsCache | undefined
  if (simulation) {
    const rawPreviousFunFactValues = await redis.get(redisKey)
    if (rawPreviousFunFactValues) {
      result = JSON.parse(rawPreviousFunFactValues) as RedisPollFunFactsCache

      if (isValidSimulation(simulation)) {
        const { situation } = simulation

        result.computedResults = mergeComputedResults(
          result.computedResults,
          simulation.computedResults
        )

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
    result = await computeAllStatValues({ id, engine }, { session })
  }

  await redis.set(redisKey, JSON.stringify(result))
  await redis.expire(redisKey, 60 * 60)

  return result
}

export const getPollStats = async (
  params: { id: string; simulation?: SimulationAsyncEvent; engine?: Engine },
  session: { session: Session }
) => {
  const { computedResults, funFactValues, simulationCount } =
    await getStatValues(params, session)

  return {
    computedResults,
    funFacts: Object.fromEntries(
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
    ) as FunFacts,
  }
}

const EXCEL_ERROR = '#####'

export const getPollSimulationsExcelData = async (
  {
    id,
    customAdditionalQuestions,
  }: {
    id: string
    customAdditionalQuestions: OrganisationPollCustomAdditionalQuestion[]
  },
  session: { session: Session }
) => {
  const data = []

  for await (const { simulation } of batchPollSimulations(
    {
      id,
      batchSize: 1000,
      select: {
        date: true,
        computedResults: true,
        additionalQuestionsAnswers: {
          select: {
            key: true,
            answer: true,
          },
        },
      },
    },
    session
  )) {
    const computedResults = ComputedResultSchema.safeParse(
      simulation.computedResults
    )

    const line = {}

    if (computedResults.error) {
      Object.assign(line, {
        date: dayjs(simulation.date).format('DD/MM/YYYY'),
        'total carbone': EXCEL_ERROR,
        'transport carbone': EXCEL_ERROR,
        'alimentation carbone': EXCEL_ERROR,
        'logement carbone': EXCEL_ERROR,
        'divers carbone': EXCEL_ERROR,
        'services sociétaux carbone': EXCEL_ERROR,
        'total eau': EXCEL_ERROR,
        'transport eau': EXCEL_ERROR,
        'alimentation eau': EXCEL_ERROR,
        'logement eau': EXCEL_ERROR,
        'divers eau': EXCEL_ERROR,
        'services sociétaux eau': EXCEL_ERROR,
      })
    } else {
      const carbon = computedResults.data[carbonMetric]
      const water = computedResults.data[waterMetric]
      Object.assign(line, {
        date: dayjs(simulation.date).format('DD/MM/YYYY'),
        'total carbone': Math.round(carbon.bilan),
        'transport carbone': Math.round(carbon.categories.transport),
        'alimentation carbone': Math.round(carbon.categories.alimentation),
        'logement carbone': Math.round(carbon.categories.logement),
        'divers carbone': Math.round(carbon.categories.divers),
        'services sociétaux carbone': Math.round(
          carbon.categories['services sociétaux']
        ),
        'total eau': Math.round(water.bilan),
        'transport eau': Math.round(water.categories.transport),
        'alimentation eau': Math.round(water.categories.alimentation),
        'logement eau': Math.round(water.categories.logement),
        'divers caeau': Math.round(water.categories.divers),
        'services sociétaux eau': Math.round(
          water.categories['services sociétaux']
        ),
      })
    }

    customAdditionalQuestions.forEach(({ question }) =>
      Object.assign(line, {
        [question]:
          simulation.additionalQuestionsAnswers.find(
            ({ key }) => key === question
          )?.answer ?? '',
      })
    )

    data.push(line)
  }

  return data
}
