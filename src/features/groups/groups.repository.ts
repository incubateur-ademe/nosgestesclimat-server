import { prisma } from '../../adapters/prisma/client'
import type {
  GroupParams,
  GroupsFetchQuery,
  ParticipantCreateDto,
  UserParams,
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

const defaultGroupSelection = {
  id: true,
  name: true,
  emoji: true,
  administrator: {
    select: {
      user: defaultUserSelection,
    },
  },
  participants: {
    select: defaultParticipantSelection,
  },
  updatedAt: true,
  createdAt: true,
}

export const createGroupAndUser = async ({
  name: groupName,
  emoji,
  administrator: { userId, name, email },
  participants,
}: GroupCreateDto) => {
  // upsert administrator
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
  // create group
  return prisma.group.create({
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
                data: participants.map(({ simulation }) => ({
                  userId,
                  simulationId: simulation,
                })),
              },
            },
          }
        : {}),
    },
    select: defaultGroupSelection,
  })
}

export const updateUserGroup = (
  { groupId, userId }: UserGroupParams,
  update: GroupUpdateDto
) => {
  return prisma.group.update({
    where: {
      id: groupId,
      administrator: {
        userId,
      },
    },
    data: update,
    select: defaultGroupSelection,
  })
}

export const createParticipantAndUser = async (
  { groupId }: GroupParams,
  { userId, name, email, simulation: simulationId }: ParticipantCreateDto
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

  return prisma.groupParticipant.upsert({
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
    select: defaultParticipantSelection,
  })
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

export const deleteParticipantById = (id: string) => {
  return prisma.groupParticipant.delete({
    where: {
      id,
    },
  })
}

export const fetchUserGroups = (
  { userId }: UserParams,
  { groupIds }: GroupsFetchQuery
) => {
  return prisma.group.findMany({
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
}

export const fetchUserGroup = ({ userId, groupId }: UserGroupParams) => {
  return prisma.group.findUniqueOrThrow({
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
  })
}
