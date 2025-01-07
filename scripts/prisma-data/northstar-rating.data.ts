import { NorthstarRatingType } from '@prisma/client'
import mongoose from 'mongoose'
import z from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import { NorthstarRating } from '../../src/schemas/NorthstarRatingSchema'

const NorthstarRatingSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    simulationId: z.string(),
    type: z.literal(NorthstarRatingType.learned),
    value: z.coerce.number().min(0).max(5).optional().nullable(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const migrateNorthstarRatingToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const northstarRatings = NorthstarRating.find({})
      .lean()
      .cursor({ batchSize: 1000 })

    for await (const rawNorthstarRating of northstarRatings) {
      const northstarRating = NorthstarRatingSchema.parse(rawNorthstarRating)
      const id = northstarRating._id.toString()
      const simulationId = northstarRating.simulationId
      const updatedAt = northstarRating.updatedAt
      const update = {
        simulationId,
        type: northstarRating.type,
        value: northstarRating.value ? northstarRating.value : 0,
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
