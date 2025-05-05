import type { Request } from 'express'
import {
  defaultUserSelection,
  defaultVerifiedUserSelection,
} from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import type { UserParams, UserUpdateDto } from './users.validator'

export const transferOwnershipToUser = async (
  { userId, email }: NonNullable<Request['user']>,
  { session }: { session: Session }
) => {
  const usersToMigrate = await session.user.findMany({
    where: {
      id: {
        not: userId,
      },
      email,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const [existingUser] = usersToMigrate

  if (!existingUser) {
    return
  }

  await session.user.upsert({
    where: {
      id: userId,
    },
    create: {
      ...existingUser,
      id: userId,
    },
    update: {
      ...existingUser,
      id: userId,
    },
  })

  const userIds = usersToMigrate.map(({ id }) => id)
  const [newUserGroupIds, oldUsersGroups] = await Promise.all([
    session.groupParticipant
      .findMany({
        where: {
          userId,
        },
        select: {
          groupId: true,
        },
      })
      .then(
        (groupParticipants) =>
          new Set(groupParticipants.map(({ groupId }) => groupId))
      ),
    session.groupParticipant.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        groupId: true,
        userId: true,
      },
    }),
  ])

  const participantsToUpdate = new Set<string>()
  const participantsToDelete = new Set<string>()
  oldUsersGroups.forEach(({ groupId, userId }) => {
    if (newUserGroupIds.has(groupId)) {
      participantsToDelete.add(userId)
    } else {
      newUserGroupIds.add(groupId)
      participantsToUpdate.add(userId)
    }
  })

  await Promise.all([
    session.groupAdministrator.updateMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      data: {
        userId,
      },
    }),
    session.simulation.updateMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      data: {
        userId,
      },
    }),
    session.groupParticipant.updateMany({
      where: {
        userId: {
          in: Array.from(participantsToUpdate),
        },
      },
      data: {
        userId,
      },
    }),
    session.groupParticipant.deleteMany({
      where: {
        userId: {
          in: Array.from(participantsToDelete),
        },
      },
    }),
  ])

  const oldPollsSimulations = await session.simulationPoll.findMany({
    skip: 1,
    where: {
      simulation: {
        userId,
      },
    },
    orderBy: {
      simulation: {
        createdAt: 'desc',
      },
    },
    select: {
      id: true,
    },
  })

  await Promise.all([
    session.user.deleteMany({
      where: {
        id: {
          not: userId,
        },
        email,
      },
    }),
    session.simulationPoll.deleteMany({
      where: {
        id: {
          in: oldPollsSimulations.map(({ id }) => id),
        },
      },
    }),
  ])
}

export const fetchUserOrThrow = (
  { userId }: UserParams,
  { session }: { session: Session }
) => {
  return session.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: defaultUserSelection,
  })
}

export const fetchUser = (
  { userId }: UserParams,
  { session }: { session: Session }
) => {
  return session.user.findUnique({
    where: {
      id: userId,
    },
    select: defaultUserSelection,
  })
}

export const updateUser = (
  { userId }: UserParams,
  { email, name }: UserUpdateDto,
  { session }: { session: Session }
) => {
  return session.user.upsert({
    where: {
      id: userId,
    },
    create: {
      id: userId,
      email,
      name,
    },
    update: {
      email,
      name,
    },
    select: defaultUserSelection,
  })
}

export const fetchVerifiedUser = (
  { email }: NonNullable<Request['user']>,
  { session }: { session: Session }
) => {
  return session.verifiedUser.findUnique({
    where: {
      email,
    },
    select: defaultVerifiedUserSelection,
  })
}

export const updateVerifiedUser = async (
  { userId, email }: NonNullable<Request['user']>,
  { name, email: newEmail }: UserUpdateDto,
  { session }: { session: Session }
) => {
  const [user] = await Promise.all([
    session.verifiedUser.upsert({
      where: {
        email,
      },
      create: {
        id: userId,
        email: newEmail || email,
        name,
      },
      update: {
        id: userId,
        name,
        ...(newEmail ? { email: newEmail } : {}),
      },
      select: defaultVerifiedUserSelection,
    }),
    session.user.upsert({
      where: {
        id: userId,
      },
      create: {
        id: userId,
        email: newEmail || email,
        name,
      },
      update: {
        email: newEmail || email,
        name,
      },
      select: { id: true },
    }),
  ])

  return user
}
