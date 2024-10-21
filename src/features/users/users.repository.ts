import type { Request } from 'express'
import { prisma } from '../../adapters/prisma/client'

export const transferOwnershipToUser = async ({
  userId,
  email,
}: NonNullable<Request['user']>) => {
  const usersToMigrate = await prisma.user.findMany({
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

  await prisma.user.upsert({
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
        prisma.groupAdministrator.updateMany({
          where: {
            userId: id,
          },
          data: {
            userId,
          },
        }),
        prisma.groupParticipant.updateMany({
          where: {
            userId: id,
          },
          data: {
            userId,
          },
        }),
        prisma.simulation.updateMany({
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

  const oldPollsSimulations = await prisma.simulationPoll.findMany({
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
    prisma.user.deleteMany({
      where: {
        id: {
          not: userId,
        },
        email,
      },
    }),
    prisma.simulationPoll.deleteMany({
      where: {
        id: {
          in: oldPollsSimulations.map(({ id }) => id),
        },
      },
    }),
  ])
}
