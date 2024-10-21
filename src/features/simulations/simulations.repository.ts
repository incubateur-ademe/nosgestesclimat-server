import type { Prisma } from '@prisma/client'
import { prisma } from '../../adapters/prisma/client'
import {
  defaultPollSelection,
  organisationSelectionWithoutPolls,
} from '../organisations/organisations.repository'
import type { OrganisationPollParams } from '../organisations/organisations.validator'
import { transferOwnershipToUser } from '../users/users.repository'
import type { UserParams } from '../users/users.validator'
import type {
  SimulationParticipantCreateDto,
  UserSimulationParams,
} from './simulations.validator'
import { type SimulationCreateDto } from './simulations.validator'

const defaultGroupParticipantSimulationSelection = {
  id: true,
  date: true,
  situation: true,
  foldedSteps: true,
  progression: true,
  actionChoices: true,
  savedViaEmail: true,
  computedResults: true,
  additionalQuestionsAnswers: {
    select: {
      key: true,
      answer: true,
      type: true,
    },
  },
  polls: {
    select: {
      pollId: true,
      poll: {
        select: {
          slug: true,
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
}

const defaultSimulationSelection = {
  ...defaultGroupParticipantSimulationSelection,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
}

export const createUserSimulation = async (simulation: SimulationCreateDto) => {
  const {
    user: { id: userId, name, email },
  } = simulation
  await prisma.user.upsert({
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
    userId,
    simulation,
    defaultSimulationSelection
  )
}

export const createParticipantSimulation = <
  T extends
    Prisma.SimulationSelect = typeof defaultGroupParticipantSimulationSelection,
>(
  userId: string,
  {
    id,
    actionChoices,
    computedResults,
    date,
    foldedSteps,
    progression,
    situation,
    savedViaEmail,
    additionalQuestionsAnswers,
  }: SimulationParticipantCreateDto,
  select: T = defaultGroupParticipantSimulationSelection as T
) => {
  return prisma.simulation.upsert({
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
  return prisma.simulation.findMany({
    where: {
      userId,
    },
    select: defaultSimulationSelection,
  })
}

export const fetchUserSimulation = ({
  simulationId,
  userId,
}: UserSimulationParams) => {
  return prisma.simulation.findUniqueOrThrow({
    where: {
      id: simulationId,
      userId,
    },
    select: defaultSimulationSelection,
  })
}

export const fetchParticipantSimulation = (simulationId: string) => {
  return prisma.simulation.findUnique({
    where: {
      id: simulationId,
    },
    select: defaultGroupParticipantSimulationSelection,
  })
}

export const createPollUserSimulation = async (
  { organisationIdOrSlug, pollIdOrSlug }: OrganisationPollParams,
  simulationDto: SimulationCreateDto
) => {
  const { id: userId, email } = simulationDto.user

  const { id: pollId } = await prisma.poll.findFirstOrThrow({
    where: {
      OR: [{ id: pollIdOrSlug }, { slug: pollIdOrSlug }],
      organisation: {
        OR: [{ id: organisationIdOrSlug }, { slug: organisationIdOrSlug }],
      },
    },
    select: {
      id: true,
    },
  })

  const { id: simulationId } = await createUserSimulation(simulationDto)

  const relation = {
    pollId,
    simulationId,
  }

  const { simulation, poll } = await prisma.simulationPoll.upsert({
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
            select: organisationSelectionWithoutPolls,
          },
        },
      },
    },
  })

  if (email) {
    await transferOwnershipToUser({
      email,
      userId,
    })
  }

  return { simulation, poll }
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
