import {
  defaultGroupParticipantSelection,
  defaultGroupSelection,
  defaultUserSelection,
} from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
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
  session: { session: Session }
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
      simulation: (await fetchParticipantSimulation(p.simulationId, session))!,
    }))
  )

export const createGroupAndUser = async (
  {
    name: groupName,
    emoji,
    administrator: { userId, name, email },
    participants,
  }: GroupCreateDto,
  { session }: { session: Session }
) => {
  // upsert administrator
  const administrator = await session.user.upsert({
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
  const [group, simulationCreation] = await Promise.all([
    // create group
    session.group.create({
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
            { session }
          ),
        ]
      : []),
  ])

  const { created, simulation, updated } = simulationCreation || {}

  return {
    simulationUpdated: updated,
    simulationCreated: created,
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
  update: GroupUpdateDto,
  { session }: { session: Session }
) => {
  const group = await session.group.update({
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
      session,
    }),
  }
}

export const createParticipantAndUser = async (
  { groupId }: GroupParams,
  { userId, name, email, simulation: simulationDto }: ParticipantCreateDto,
  { session }: { session: Session }
) => {
  // Dedupe user
  if (email) {
    await transferOwnershipToUser({ email, userId }, { session })
  }

  const existingParticipant = await session.groupParticipant.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  })

  // upsert user
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
  })

  // For now no relation
  const { id: simulationId } = simulationDto
  const [simulationCreation, participant] = await Promise.all([
    createParticipantSimulation(
      {
        userId,
        simulation: simulationDto,
      },
      { session }
    ),
    session.groupParticipant.upsert({
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

  const {
    created: simulationCreated,
    simulation,
    updated: simulationUpdated,
  } = simulationCreation

  return {
    participant: {
      ...participant,
      simulation,
    },
    simulationUpdated,
    simulationCreated,
    created: !existingParticipant,
    updated: !!existingParticipant,
  }
}

export const findGroupAndParticipantById = (
  { groupId, participantId }: UserGroupParticipantParams,
  { session }: { session: Session }
) => {
  return session.groupParticipant.findUniqueOrThrow({
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
}

export const deleteParticipantById = async (
  id: string,
  { session }: { session: Session }
) => {
  return session.groupParticipant.delete({
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
}

export const fetchUserGroups = async (
  { userId }: UserParams,
  { groupIds }: GroupsFetchQuery,
  { session }: { session: Session }
) => {
  const groups = await session.group.findMany({
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
        session,
      }),
    }))
  )
}

export const fetchUserGroup = async (
  { groupId }: GroupParams,
  { session }: { session: Session }
) => {
  const group = await session.group.findUniqueOrThrow({
    where: {
      id: groupId,
    },
    select: defaultGroupSelection,
  })

  return {
    ...group,
    participants: await getParticipantsWithSimulations(group, {
      session,
    }),
  }
}

export const deleteUserGroup = async (
  {
    userId,
    groupId,
  }: {
    userId: string
    groupId: string
  },
  { session }: { session: Session }
) => {
  return session.group.delete({
    where: {
      id: groupId,
      administrator: {
        userId,
      },
    },
    select: defaultGroupSelection,
  })
}

export const getAdministratorGroupsStats = async (
  administratorId: string,
  { session }: { session: Session }
) => {
  const [createdGroupsCount, createdGroupsWithOneParticipantCount, group] =
    await Promise.all([
      session.group.count({
        where: {
          administrator: {
            userId: administratorId,
          },
        },
      }),
      session.group.count({
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
      session.group.findFirst({
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

export const getGroupsJoinedCount = (
  userId: string,
  { session }: { session: Session }
) => {
  return session.groupParticipant.count({
    where: {
      userId,
    },
  })
}
