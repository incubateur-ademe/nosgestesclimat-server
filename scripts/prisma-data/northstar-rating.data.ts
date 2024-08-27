import mongoose from 'mongoose'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import { NorthstarRating } from '../../src/schemas/NorthstarRatingSchema'

const migrateNorthstarRatingToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const northstarRatings = NorthstarRating.find({})
      .lean()
      .cursor({ batchSize: 1000 })

    for await (const northstarRating of northstarRatings) {
      const id = northstarRating._id.toString()
      const simulationId = northstarRating.simulationId!
      const updatedAt = northstarRating.updatedAt
      const update = {
        simulationId,
        type: northstarRating.type as 'learned',
        value: northstarRating.value ? +northstarRating.value : 0,
        createdAt: northstarRating.createdAt,
        updatedAt,
      }

      const existingNorthstarRating = await prisma.northstarRating.findFirst({
        where: {
          simulationId,
        },
      })

      if (
        !!existingNorthstarRating?.updatedAt &&
        existingNorthstarRating.updatedAt > updatedAt
      ) {
        logger.warn('Deduping rating for same simulation', {
          existingNorthstarRating,
        })
        continue
      }

      await prisma.northstarRating.upsert({
        where: {
          simulationId,
        },
        create: {
          id,
          ...update,
        },
        update,
      })
      documents++
    }

    logger.info('NorthstarRatings imported', { documents })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateNorthstarRatingToPg()
