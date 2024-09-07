import { randomUUID } from 'crypto'
import { prisma } from '../../adapters/prisma/client'
import type { GroupParams, ParticipantCreateDto } from './groups.validator'
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
                  id: randomUUID(),
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
      id: randomUUID(),
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
