import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import {
  defaultOrganisationSelectionWithoutPolls,
  defaultPollSelection,
  defaultSimulationSelection,
  defaultSimulationSelectionWithoutPollAndSituation,
  defaultSimulationSelectionWithoutUser,
} from '../../adapters/prisma/selection.js'
import type { Session } from '../../adapters/prisma/transaction.js'
import { batchFindMany } from '../../core/batch-find-many.js'
import type { PaginationQuery } from '../../core/pagination.js'
import type { PublicPollParams } from '../organisations/organisations.validator.js'
import type { UserParams } from '../users/users.validator.js'
import type {
  SimulationCreateDto,
  SimulationParticipantCreateDto,
} from './simulations.validator.js'

export const createParticipantSimulation = async <
  T extends
    Prisma.SimulationSelect = typeof defaultSimulationSelectionWithoutUser,
>(
  {
    email,
    userId,
    simulation: {
      id,
      actionChoices,
      computedResults,
      date,
      model,
      foldedSteps,
      progression,
      situation,
      savedViaEmail,
      extendedSituation,
      additionalQuestionsAnswers,
    },
    select = defaultSimulationSelectionWithoutUser as T,
  }: {
    email?: string
    userId: string
    simulation: SimulationParticipantCreateDto
    select?: T
  },
  { session }: { session: Session }
) => {
  const existingSimulation = await session.simulation.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  })

  const payload: Omit<Prisma.SimulationCreateInput, 'id'> = {
    date,
    model,
    user: {
      connect: {
        id: userId,
      },
    },
    ...(email
      ? {
          verifiedUser: {
            connect: {
              email,
            },
          },
        }
      : {}),
    situation,
    foldedSteps,
    progression,
    actionChoices,
    savedViaEmail,
    computedResults,
    extendedSituation,
    states: {
      create: {
        date: new Date(),
        progression,
      },
    },
    ...(additionalQuestionsAnswers?.length
      ? {
          additionalQuestionsAnswers: {
            ...(existingSimulation
              ? {
                  deleteMany: {
                    simulationId: id,
                  },
                }
              : {}),
            createMany: {
              data: additionalQuestionsAnswers.map(({ type, key, answer }) => ({
                type,
                key,
                answer,
              })),
            },
          },
        }
      : {}),
  }

  const simulation = existingSimulation
    ? await session.simulation.update({
        where: {
          id,
        },
        data: {
          ...payload,
        },
        select,
      })
    : await session.simulation.create({
        data: {
          id,
          ...payload,
        },
        select,
      })

  return {
    simulation,
    created: !existingSimulation,
    updated: !!existingSimulation,
  }
}

export const fetchUserSimulations = async (
  { userId }: UserParams & Partial<NonNullable<Request['user']>>,
  {
    session,
    query: { pageSize, page },
  }: { session: Session; query: PaginationQuery }
) => {
  const where = {
    ...{ userId },
    progression: {
      gt: 0,
    },
  }

  const [simulations, count] = await Promise.all([
    session.simulation.findMany({
      where,
      skip: page * pageSize,
      take: pageSize,
      select: defaultSimulationSelection,
      orderBy: {
        date: 'desc',
      },
    }),
    session.simulation.count({ where }),
  ])

  return {
    simulations,
    count,
  }
}

export const fetchSimulationById = (
  { simulationId }: { simulationId: string },
  { session }: { session: Session }
) => {
  return session.simulation.findUniqueOrThrow({
    where: {
      id: simulationId,
    },
    select: defaultSimulationSelection,
  })
}

export const createPollUserSimulation = async (
  params: PublicPollParams & Partial<Request['user']>,
  simulationDto: SimulationCreateDto,
  { session }: { session: Session }
) => {
  const { userId, pollIdOrSlug, email = simulationDto.user?.email } = params
  const { id: pollId } = await session.poll.findFirstOrThrow({
    where: {
      OR: [{ id: pollIdOrSlug }, { slug: pollIdOrSlug }],
    },
    select: {
      id: true,
    },
  })

  const existingParticipation = await session.simulationPoll.findFirst({
    where: {
      pollId,
      simulation: {
        user: email ? { email } : { id: userId },
      },
    },
    select: { id: true },
  })

  const {
    simulation: { id: simulationId },
    created: simulationCreated,
    updated: simulationUpdated,
  } = await createParticipantSimulation(
    {
      ...params,
      simulation: simulationDto,
      select: defaultSimulationSelection,
    },
    { session }
  )

  const relation = {
    pollId,
    simulationId,
  }

  const { simulation, poll } = await session.simulationPoll.upsert({
    where: {
      simulationId_pollId: relation,
    },
    create: relation,
    update: {},
    select: {
      simulation: {
        select: defaultSimulationSelection,
      },
      poll: {
        select: {
          ...defaultPollSelection,
          organisation: {
            select: defaultOrganisationSelectionWithoutPolls,
          },
        },
      },
    },
  })

  return {
    poll,
    simulation,
    created: simulationCreated,
    updated: simulationUpdated,
    isNewParticipation: !existingParticipation,
  }
}

export const countOrganisationPublicPollSimulations = (
  {
    id,
  }: {
    id: string
  },
  { session }: { session: Session }
) => {
  return session.simulationPoll.count({
    where: {
      pollId: id,
    },
  })
}

export const fetchPollSimulations = <
  T extends
    Prisma.SimulationSelect = typeof defaultSimulationSelectionWithoutPollAndSituation,
>(
  {
    id,
    user: _user = {},
    select = defaultSimulationSelectionWithoutPollAndSituation as T,
  }: {
    id: string
    user?: Partial<(UserParams & { email?: undefined }) | Request['user']>
    select?: T
  },
  { session }: { session: Session }
) => {
  // TODO should filter according connectedUser at some point
  // const { email, userId } = _user

  return session.simulation.findMany({
    where: {
      polls: {
        some: {
          poll: {
            id,
            // ...(email
            //   ? {
            //       organisation: {
            //         administrators: {
            //           some: {
            //             user: {
            //               email,
            //             },
            //           },
            //         },
            //       },
            //     }
            //   : {
            //       simulations: {
            //         some: {
            //           simulation: {
            //             userId,
            //           },
            //         },
            //       },
            //     }),
          },
        },
      },
    },
    select,
  })
}

export const batchPollSimulations = <
  T extends
    Prisma.SimulationSelect = typeof defaultSimulationSelectionWithoutUser,
>(
  {
    id,
    batchSize = 100,
    select = defaultSimulationSelection as T,
  }: {
    id: string
    batchSize?: number
    select?: T
  },
  { session }: { session: Session }
) => {
  return batchFindMany(
    (params) =>
      session.simulationPoll.findMany({
        ...params,
        where: { pollId: id },
        select: {
          id: true,
          simulation: {
            select,
          },
        },
      }),
    { batchSize }
  )
}
