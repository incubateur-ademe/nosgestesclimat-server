import mongoose from 'mongoose'
import z from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { isValidEmail } from '../../src/core/typeguards/isValidEmail'
import logger from '../../src/logger'
import { User } from '../../src/schemas/UserSchema'

const UserSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    userId: z.string().uuid(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const migrateUserToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const users = User.find({}).lean().cursor({ batchSize: 1000 })

    for await (const rawUser of users) {
      const user = UserSchema.parse(rawUser)
      const id = user.userId.toString()
      const update = {
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        ...(user.email && isValidEmail(user.email)
          ? { email: user.email.toLocaleLowerCase() }
          : {}),
      }

      await prisma.user.upsert({
        where: {
          id,
        },
        create: {
          id,
          ...update,
        },
        update,
      })

      documents++
    }

    logger.info('Users imported', { documents })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateUserToPg()
