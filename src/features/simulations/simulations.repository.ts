import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import {
  defaultOrganisationSelectionWithoutPolls,
  defaultPollSelection,
  defaultSimulationSelection,
  defaultSimulationSelectionWithoutPollAndSituation,
  defaultSimulationSelectionWithoutUser,
} from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import { batchFindMany } from '../../core/batchFindMany'
import type { PublicPollParams } from '../organisations/organisations.validator'
import { transferOwnershipToUser } from '../users/users.repository'
import type { UserParams } from '../users/users.validator'
import type {
  SimulationCreateDto,
  SimulationParticipantCreateDto,
  UserSimulationParams,
} from './simulations.validator'

export const createUserSimulation = async (
  { userId }: UserParams,
  simulation: SimulationCreateDto,
  { session }: { session: Session }
) => {
  const { user: { name, email } = {} } = simulation
  await session.user.upsert({
    where: {
      id: userId,
    },
    create: {
      id: userId,
      name,
      email,
    },
    update: {
      name,
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  return createParticipantSimulation(
    {
      userId,
      simulation,
      select: defaultSimulationSelection,
    },
    { session }
  )
}

export const createParticipantSimulation = async <
  T extends
    Prisma.SimulationSelect = typeof defaultSimulationSelectionWithoutUser,
>(
  {
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
      additionalQuestionsAnswers,
    },
    select = defaultSimulationSelectionWithoutUser as T,
  }: {
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

  const payload = {
    date,
    model,
    userId,
    situation,
    foldedSteps,
    progression,
    actionChoices,
    savedViaEmail,
    computedResults,
    ...(!!additionalQuestionsAnswers?.length
      ? {
          additionalQuestionsAnswers: {
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

  const simulation = !!existingSimulation
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

export const fetchUserSimulations = (
  { userId }: UserParams,
  { session }: { session: Session }
) => {
  return session.simulation.findMany({
    where: {
      userId,
    },
    select: defaultSimulationSelection,
  })
}

export const fetchUserSimulation = (
  {
    simulationId,
    // userId,
  }: UserSimulationParams,
  { session }: { session: Session }
) => {
  return session.simulation.findUniqueOrThrow({
    where: {
      id: simulationId,
      // userId,
    },
    select: defaultSimulationSelection,
  })
}

export const fetchParticipantSimulation = (
  simulationId: string,
  { session }: { session: Session }
) => {
  return session.simulation.findUnique({
    where: {
      id: simulationId,
    },
    select: defaultSimulationSelectionWithoutUser,
  })
}

export const createPollUserSimulation = async (
  params: PublicPollParams,
  simulationDto: SimulationCreateDto,
  { session }: { session: Session }
) => {
  const { userId, pollIdOrSlug } = params
  const { email } = simulationDto.user ?? {}
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
  } = await createUserSimulation(params, simulationDto, { session })

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

  if (email) {
    await transferOwnershipToUser(
      {
        email,
        userId,
      },
      { session }
    )
  }

  return {
    poll,
    simulation,
    simulationCreated,
    simulationUpdated,
    created: !existingParticipation,
    updated: !!existingParticipation,
  }
}

export const getIncompleteSimulationsCount = (
  user: {
    userId: string
    userEmail: string
  },
  { session }: { session: Session }
) => {
  return session.simulation.count({
    where: {
      ...user,
      progression: {
        lt: 1,
      },
    },
  })
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

export const batchPollSimulations = (
  {
    id,
    batchSize = 100,
  }: {
    id: string
    batchSize?: number
  },
  { session }: { session: Session }
) => {
  return batchFindMany(
    (params) =>
      session.simulation.findMany({
        ...params,
        where: { polls: { some: { poll: { id } } } },
        select: defaultSimulationSelection,
      }),
    { batchSize }
  )
}
