import { randomUUID } from 'crypto'
import { prisma } from '../../adapters/prisma/client'
import type {
  GroupCreateDto,
  GroupUpdateDto,
  UserGroupParams,
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

const defaultSelection = {
  id: true,
  name: true,
  emoji: true,
  administrator: {
    select: {
      user: defaultUserSelection,
    },
  },
  participants: {
    select: {
      id: true,
      user: defaultUserSelection,
      simulationId: true,
    },
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
    select: defaultSelection,
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
    select: defaultSelection,
  })
}
