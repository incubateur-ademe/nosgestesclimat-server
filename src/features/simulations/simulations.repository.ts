import type { Prisma } from '@prisma/client'
import { prisma } from '../../adapters/prisma/client'
import {
  defaultOrganisationSelectionWithoutPolls,
  defaultPollSelection,
  defaultSimulationSelection,
  defaultSimulationSelectionWithoutPoll,
  defaultSimulationSelectionWithoutUser,
} from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import { findOrganisationPublicPollBySlugOrId } from '../organisations/organisations.repository'
import type { PublicPollParams } from '../organisations/organisations.validator'
import { transferOwnershipToUser } from '../users/users.repository'
import type { UserParams } from '../users/users.validator'
import type {
  SimulationCreateDto,
  SimulationParticipantCreateDto,
  UserSimulationParams,
} from './simulations.validator'

export const createUserSimulation = (
  { userId }: UserParams,
  simulation: SimulationCreateDto,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const { user: { name, email } = {} } = simulation
    await prismaSession.user.upsert({
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
      { session: prismaSession }
    )
  }, session)
}

export const createParticipantSimulation = <
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
  return session.simulation.upsert({
    where: {
      id,
    },
    create: {
      id,
      date,
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
                data: additionalQuestionsAnswers.map(
                  ({ type, key, answer }) => ({
                    type,
                    key,
                    answer,
                  })
                ),
              },
            },
          }
        : {}),
    },
    update: {
      id,
      date,
      userId,
      situation,
      foldedSteps,
      progression,
      actionChoices,
      savedViaEmail,
      computedResults,
      additionalQuestionsAnswers: {
        deleteMany: {
          simulationId: id,
        },
        ...(!!additionalQuestionsAnswers?.length
          ? {
              createMany: {
                data: additionalQuestionsAnswers.map(
                  ({ type, key, answer }) => ({
                    type,
                    key,
                    answer,
                  })
                ),
              },
            }
          : {}),
      },
    },
    select,
  })
}

export const fetchUserSimulations = ({ userId }: UserParams) => {
  return transaction((prismaSession) =>
    prismaSession.simulation.findMany({
      where: {
        userId,
      },
      select: defaultSimulationSelection,
    })
  )
}

export const fetchUserSimulation = ({
  simulationId,
  userId,
}: UserSimulationParams) => {
  return transaction((prismaSession) =>
    prismaSession.simulation.findUniqueOrThrow({
      where: {
        id: simulationId,
        userId,
      },
      select: defaultSimulationSelection,
    })
  )
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

export const createPollUserSimulation = (
  params: PublicPollParams,
  simulationDto: SimulationCreateDto,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const { userId, pollIdOrSlug } = params
    const { email } = simulationDto.user ?? {}
    const { id: pollId } = await prismaSession.poll.findFirstOrThrow({
      where: {
        OR: [{ id: pollIdOrSlug }, { slug: pollIdOrSlug }],
      },
      select: {
        id: true,
      },
    })

    const { id: simulationId } = await createUserSimulation(
      params,
      simulationDto,
      { session: prismaSession }
    )

    const relation = {
      pollId,
      simulationId,
    }

    const { simulation, poll } = await prismaSession.simulationPoll.upsert({
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
        { session: prismaSession }
      )
    }

    return { simulation, poll }
  }, session)
}

export const getIncompleteSimulationsCount = (user: {
  userId: string
  userEmail: string
}) => {
  return prisma.simulation.count({
    where: {
      ...user,
      progression: {
        lt: 1,
      },
    },
  })
}

export const fetchPollSimulations = ({
  params,
  user,
}: {
  params: PublicPollParams
  user?: { email: string }
}) => {
  return transaction(async (prismaSession) => {
    const { id } = await findOrganisationPublicPollBySlugOrId(
      { params },
      { session: prismaSession }
    )

    const email = user?.email
    const { userId } = params

    return prismaSession.simulation.findMany({
      where: {
        polls: {
          some: {
            poll: {
              id,
              ...(email
                ? {
                    organisation: {
                      administrators: {
                        some: {
                          user: {
                            email,
                          },
                        },
                      },
                    },
                  }
                : {
                    simulations: {
                      some: {
                        simulation: {
                          userId,
                        },
                      },
                    },
                  }),
            },
          },
        },
      },
      select: defaultSimulationSelectionWithoutPoll,
    })
  })
}
