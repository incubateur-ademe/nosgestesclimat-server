import type { Request } from 'express'
import { defaultUserSelection } from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import type { UserParams } from './users.validator'

export const transferOwnershipToUser = (
  { userId, email }: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const usersToMigrate = await prismaSession.user.findMany({
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

    await prismaSession.user.upsert({
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
      prismaSession.groupParticipant
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
      prismaSession.groupParticipant.findMany({
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
      prismaSession.groupAdministrator.updateMany({
        where: {
          userId: {
            in: userIds,
          },
        },
        data: {
          userId,
        },
      }),
      prismaSession.simulation.updateMany({
        where: {
          userId: {
            in: userIds,
          },
        },
        data: {
          userId,
        },
      }),
      prismaSession.groupParticipant.updateMany({
        where: {
          userId: {
            in: Array.from(participantsToUpdate),
          },
        },
        data: {
          userId,
        },
      }),
      prismaSession.groupParticipant.deleteMany({
        where: {
          userId: {
            in: Array.from(participantsToDelete),
          },
        },
      }),
    ])

    const oldPollsSimulations = await prismaSession.simulationPoll.findMany({
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
      prismaSession.user.deleteMany({
        where: {
          id: {
            not: userId,
          },
          email,
        },
      }),
      prismaSession.simulationPoll.deleteMany({
        where: {
          id: {
            in: oldPollsSimulations.map(({ id }) => id),
          },
        },
      }),
    ])
  }, session)
}

export const fetchUser = (
  { userId }: UserParams,
  { session }: { session?: Session } = {}
) => {
  return transaction(
    (prismaSession) =>
      prismaSession.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: defaultUserSelection,
      }),
    session
  )
}
