import { prisma } from '../../adapters/prisma/client'
import {
  createParticipantSimulation,
  fetchParticipantSimulation,
} from '../simulations/simulations.repository'
import type { UserParams } from '../users/users.validator'
import type {
  GroupParams,
  GroupsFetchQuery,
  ParticipantCreateDto,
} from './groups.validator'
import {
  type GroupCreateDto,
  type GroupUpdateDto,
  type UserGroupParams,
} from './groups.validator'

const defaultUserSelection = {
  select: {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    updatedAt: true,
  },
}

const defaultParticipantSelection = {
  id: true,
  user: defaultUserSelection,
  simulationId: true,
}

const groupSelectionWithoutParticipants = {
  id: true,
  name: true,
  emoji: true,
  administrator: {
    select: {
      user: defaultUserSelection,
    },
  },
  updatedAt: true,
  createdAt: true,
}

const defaultGroupSelection = {
  ...groupSelectionWithoutParticipants,
  participants: {
    select: defaultParticipantSelection,
  },
}

const getParticipantsWithSimulations = <
  T extends { simulationId: string },
>(group: {
  participants: T[]
}): Promise<
  Array<
    T & {
      simulation: NonNullable<
        Awaited<ReturnType<typeof fetchParticipantSimulation>>
      >
    }
  >
> =>
  Promise.all(
    group.participants.map(async (p) => ({
      ...p,
      simulation: (await fetchParticipantSimulation(p.simulationId))!,
    }))
  )

export const createGroupAndUser = async ({
  name: groupName,
  emoji,
  administrator: { userId, name, email },
  participants,
}: GroupCreateDto) => {
  // upsert administrator
  const administrator = await prisma.user.upsert({
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
  })

  const [participantDto] = participants || []

  // For now no relation
  const [group, simulation] = await Promise.all([
    // create group
    prisma.group.create({
      data: {
        name: groupName,
        emoji,
        administrator: {
          create: {
            userId,
          },
        },
        ...(participants?.length
          ? {
              participants: {
                createMany: {
                  data: participants.map(({ simulation: { id } }) => ({
                    userId,
                    simulationId: id,
                  })),
                },
              },
            }
          : {}),
      },
      select: defaultGroupSelection,
    }),
    // create simulation if any
    ...(participantDto
      ? [createParticipantSimulation(userId, participantDto.simulation)]
      : []),
  ])

  return {
    administrator,
    simulation,
    group: {
      ...group,
      participants: group.participants.map((p) => ({
        ...p,
        simulation,
      })),
    },
  }
}

export const updateUserGroup = async (
  { groupId, userId }: UserGroupParams,
  update: GroupUpdateDto
) => {
  const group = await prisma.group.update({
    where: {
      id: groupId,
      administrator: {
        userId,
      },
    },
    data: update,
    select: defaultGroupSelection,
  })

  return {
    ...group,
    participants: await getParticipantsWithSimulations(group),
  }
}

export const createParticipantAndUser = async (
  { groupId }: GroupParams,
  { userId, name, email, simulation: simulationDto }: ParticipantCreateDto
) => {
  // upsert user
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
  })

  // For now no relation
  const { id: simulationId } = simulationDto
  const [simulation, participant] = await Promise.all([
    createParticipantSimulation(userId, simulationDto),
    prisma.groupParticipant.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      create: {
        groupId,
        userId,
        simulationId,
      },
      update: {
        simulationId,
      },
      select: {
        ...defaultParticipantSelection,
        group: {
          select: defaultGroupSelection,
        },
      },
    }),
  ])

  return {
    ...participant,
    simulation,
  }
}

export const findGroupById = (id: string) => {
  return prisma.group.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      id: true,
      administrator: {
        select: {
          userId: true,
        },
      },
    },
  })
}

export const findGroupParticipantById = (id: string) => {
  return prisma.groupParticipant.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
    },
  })
}

export const deleteParticipantById = async (id: string) => {
  return prisma.groupParticipant.delete({
    where: {
      id,
    },
    select: {
      group: {
        select: defaultGroupSelection,
      },
      user: defaultUserSelection,
    },
  })
}

export const fetchUserGroups = async (
  { userId }: UserParams,
  { groupIds }: GroupsFetchQuery
) => {
  const groups = await prisma.group.findMany({
    where: {
      OR: [
        {
          administrator: {
            user: {
              id: userId,
            },
          },
        },
        {
          participants: {
            some: {
              userId,
            },
          },
        },
      ],
      ...(groupIds?.length
        ? {
            id: {
              in: groupIds,
            },
          }
        : {}),
    },
    select: defaultGroupSelection,
  })

  return Promise.all(
    groups.map(async (group) => ({
      ...group,
      participants: await getParticipantsWithSimulations(group),
    }))
  )
}

export const fetchUserGroup = async ({ userId, groupId }: UserGroupParams) => {
  const group = await prisma.group.findUniqueOrThrow({
    where: {
      id: groupId,
      OR: [
        {
          administrator: {
            user: {
              id: userId,
            },
          },
        },
        {
          participants: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: defaultGroupSelection,
  })

  return {
    ...group,
    participants: await getParticipantsWithSimulations(group),
  }
}

export const deleteUserGroup = async ({
  userId,
  groupId,
}: {
  userId: string
  groupId: string
}) => {
  return prisma.group.delete({
    where: {
      id: groupId,
      administrator: {
        userId,
      },
    },
    select: defaultGroupSelection,
  })
}

export const getAdministratorGroupsStats = async (administratorId: string) => {
  const [createdGroupsCount, createdGroupsWithOneParticipantCount, group] =
    await Promise.all([
      prisma.group.count({
        where: {
          administrator: {
            userId: administratorId,
          },
        },
      }),
      prisma.group.count({
        where: {
          administrator: {
            userId: administratorId,
          },
          participants: {
            every: {
              userId: administratorId,
            },
          },
        },
      }),
      prisma.group.findFirst({
        where: {
          administrator: {
            userId: administratorId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      }),
    ])

  return {
    createdGroupsCount,
    createdGroupsWithOneParticipantCount: createdGroupsWithOneParticipantCount,
    lastGroupCreationDate: group?.createdAt,
  }
}

export const getGroupsJoinedCount = (userId: string) => {
  return prisma.groupParticipant.count({
    where: {
      userId,
    },
  })
}
