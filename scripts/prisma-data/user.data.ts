import mongoose from 'mongoose'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import { User } from '../../src/schemas/UserSchema'

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const isValidEmail = (email: unknown): email is string =>
  typeof email === 'string' && EMAIL_REGEX.test(email.toLocaleLowerCase())

const migrateUserToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const users = User.find({}).lean().cursor({ batchSize: 1000 })

    for await (const user of users) {
      const id = user.userId.toString()
      const update = {
        name: user.name,
        email: isValidEmail(user.email) ? user.email.toLocaleLowerCase() : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }

      try {
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
      } catch (e) {
        console.error(e)
        console.error(update)
        throw e
      }

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
