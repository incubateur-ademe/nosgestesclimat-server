import type { Prisma, User } from '@prisma/client'
import type { Request } from 'express'
import { defaultUserSelection } from '../../adapters/prisma/selection.js'
import type {
  FetchEntityResponse,
  RequestOptions,
  RequestOptionsOrNull,
  Session,
} from '../../adapters/prisma/transaction.js'
import type { UserUpdateDto } from './users.validator.js'

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

  await createOrUpdateUser(
    {
      id: userId,
      user: existingUser,
    },
    { session }
  )

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

export const fetchUser = <
  Select extends Prisma.UserSelect = { id: true },
  Options extends RequestOptions = RequestOptionsOrNull,
>(
  { id, select = { id: true } as Select }: { id: string; select?: Select },
  { session, orThrow }: Options
): FetchEntityResponse<Prisma.UserGetPayload<{ select: Select }>, Options> => {
  const method = orThrow
    ? session.user.findUniqueOrThrow
    : session.user.findUnique

  return method({
    where: {
      id,
    },
    select,
  }) as FetchEntityResponse<Prisma.UserGetPayload<{ select: Select }>, Options>
}

export const fetchVerifiedUser = <
  Select extends Prisma.VerifiedUserSelect = { id: true },
  Options extends RequestOptions = RequestOptionsOrNull,
>(
  {
    email,
    select = { id: true } as Select,
  }: { email: string; select?: Select },
  { session, orThrow }: Options
): FetchEntityResponse<
  Prisma.VerifiedUserGetPayload<{ select: Select }>,
  Options
> => {
  const method = orThrow
    ? session.verifiedUser.findUniqueOrThrow
    : session.verifiedUser.findUnique

  return method({
    where: {
      email,
    },
    select,
  }) as FetchEntityResponse<
    Prisma.VerifiedUserGetPayload<{ select: Select }>,
    Options
  >
}

export const fetchUsersForEmail = (
  { email }: Pick<NonNullable<Request['user']>, 'email'>,
  { session }: { session: Session }
) => {
  return session.user.findMany({
    where: {
      email,
    },
    select: defaultUserSelection,
  })
}

export const createOrUpdateUser = async <
  Select extends Prisma.UserSelect = { id: true },
>(
  {
    id,
    user: { email, name, createdAt, updatedAt },
    select = { id: true } as Select,
  }: {
    id: string
    user: Partial<User>
    select?: Select
  },
  { session }: { session: Session }
) => {
  const existingUser = await fetchUser({ id }, { session })

  const user = existingUser
    ? await session.user.update({
        where: {
          id,
        },
        data: {
          name,
          email,
          updatedAt,
          createdAt,
        },
        select,
      })
    : await session.user.create({
        data: {
          id,
          name,
          email,
          updatedAt,
          createdAt,
        },
        select,
      })

  return {
    user,
    created: !existingUser,
    updated: !!existingUser,
  }
}

export const createOrUpdateVerifiedUser = async <
  Select extends Prisma.VerifiedUserSelect = { id: true },
>(
  {
    id: { userId, email },
    user: { name, email: newEmail },
    select = { email: true } as Select,
  }: { id: NonNullable<Request['user']>; user: UserUpdateDto; select?: Select },
  { session }: { session: Session }
) => {
  const existingUser = await fetchVerifiedUser({ email }, { session })

  const [user] = await Promise.all([
    existingUser
      ? session.verifiedUser.update({
          where: {
            email,
          },
          data: {
            id: userId,
            name,
            ...(newEmail ? { email: newEmail } : {}),
          },
          select,
        })
      : session.verifiedUser.create({
          data: {
            id: userId,
            email: newEmail || email,
            name,
          },
          select,
        }),

    createOrUpdateUser(
      {
        id: userId,
        user: {
          email: newEmail || email,
          name,
        },
      },
      { session }
    ),
  ])

  return {
    user,
    created: !existingUser,
    updated: !!existingUser,
  }
}
