import type { Request } from 'express'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'

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

    await Promise.all(
      usersToMigrate.map(({ id }) =>
        Promise.all([
          prismaSession.groupAdministrator.updateMany({
            where: {
              userId: id,
            },
            data: {
              userId,
            },
          }),
          prismaSession.groupParticipant.updateMany({
            where: {
              userId: id,
            },
            data: {
              userId,
            },
          }),
          prismaSession.simulation.updateMany({
            where: {
              userId: id,
            },
            data: {
              userId,
            },
          }),
        ])
      )
    )

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
