import mongoose from 'mongoose'
import z from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import Survey from '../../src/schemas/_legacy/SurveySchema'

const SurveySchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    name: z.string(),
    contextFile: z.string().optional(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const migrateSurveyToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const surveys = Survey.find({}).lean().cursor({ batchSize: 1000 })

    for await (const rawSurvey of surveys) {
      const survey = SurveySchema.parse(rawSurvey)
      const updatedAt = survey.updatedAt

      const id = survey._id.toString()
      const name = survey.name
      const update = {
        name,
        contextFile: survey.contextFile,
        createdAt: survey.createdAt,
        updatedAt,
      }

      const existingSurvey = await prisma.survey.findFirst({
        where: {
          name,
        },
      })

      if (!!existingSurvey?.updatedAt && existingSurvey.updatedAt > updatedAt) {
        logger.warn('Deduping survey for same name', {
          existingSurvey,
        })
        continue
      }

      try {
        await prisma.survey.upsert({
          where: {
            name,
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

    logger.info('Surveys imported', { documents })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateSurveyToPg()
