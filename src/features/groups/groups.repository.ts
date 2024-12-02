import { prisma } from '../../adapters/prisma/client'
import {
  defaultGroupParticipantSelection,
  defaultGroupSelection,
  defaultUserSelection,
} from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import {
  createParticipantSimulation,
  fetchParticipantSimulation,
} from '../simulations/simulations.repository'
import { transferOwnershipToUser } from '../users/users.repository'
import type { UserParams } from '../users/users.validator'
import type {
  GroupParams,
  GroupsFetchQuery,
  ParticipantCreateDto,
  UserGroupParticipantParams,
} from './groups.validator'
import {
  type GroupCreateDto,
  type GroupUpdateDto,
  type UserGroupParams,
} from './groups.validator'

const getParticipantsWithSimulations = <T extends { simulationId: string }>(
  group: {
    participants: T[]
  },
  prismaSession: { session: Session }
): Promise<
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
      simulation: (await fetchParticipantSimulation(
        p.simulationId,
        prismaSession
      ))!,
    }))
  )

export const createGroupAndUser = (
  {
    name: groupName,
    emoji,
    administrator: { userId, name, email },
    participants,
  }: GroupCreateDto,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    // upsert administrator
    const administrator = await prismaSession.user.upsert({
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
      prismaSession.group.create({
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
        ? [
            createParticipantSimulation(
              {
                userId,
                simulation: participantDto.simulation,
              },
              { session: prismaSession }
            ),
          ]
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
  }, session)
}

export const updateUserGroup = (
  { groupId, userId }: UserGroupParams,
  update: GroupUpdateDto,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const group = await prismaSession.group.update({
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
      participants: await getParticipantsWithSimulations(group, {
        session: prismaSession,
      }),
    }
  }, session)
}

export const createParticipantAndUser = async (
  { groupId }: GroupParams,
  { userId, name, email, simulation: simulationDto }: ParticipantCreateDto,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    // Dedupe user
    if (email) {
      await transferOwnershipToUser(
        { email, userId },
        { session: prismaSession }
      )
    }

    // upsert user
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
    })

    // For now no relation
    const { id: simulationId } = simulationDto
    const [simulation, participant] = await Promise.all([
      createParticipantSimulation(
        {
          userId,
          simulation: simulationDto,
        },
        { session: prismaSession }
      ),
      prismaSession.groupParticipant.upsert({
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
          ...defaultGroupParticipantSelection,
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
  }, session)
}

export const findGroupAndParticipantById = ({
  groupId,
  participantId,
}: UserGroupParticipantParams) => {
  return transaction((prismaSession) =>
    prismaSession.groupParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
        group: {
          id: groupId,
        },
      },
      select: {
        id: true,
        userId: true,
        group: {
          select: {
            administrator: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })
  )
}

export const deleteParticipantById = async (id: string) => {
  return transaction((prismaSession) =>
    prismaSession.groupParticipant.delete({
      where: {
        id,
      },
      select: {
        group: {
          select: defaultGroupSelection,
        },
        user: {
          select: defaultUserSelection,
        },
      },
    })
  )
}

export const fetchUserGroups = async (
  { userId }: UserParams,
  { groupIds }: GroupsFetchQuery,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const groups = await prismaSession.group.findMany({
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
        participants: await getParticipantsWithSimulations(group, {
          session: prismaSession,
        }),
      }))
    )
  }, session)
}

export const fetchUserGroup = async (
  { groupId }: GroupParams,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const group = await prismaSession.group.findUniqueOrThrow({
      where: {
        id: groupId,
      },
      select: defaultGroupSelection,
    })

    return {
      ...group,
      participants: await getParticipantsWithSimulations(group, {
        session: prismaSession,
      }),
    }
  }, session)
}

export const deleteUserGroup = async ({
  userId,
  groupId,
}: {
  userId: string
  groupId: string
}) => {
  return transaction((prismaSession) =>
    prismaSession.group.delete({
      where: {
        id: groupId,
        administrator: {
          userId,
        },
      },
      select: defaultGroupSelection,
    })
  )
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
