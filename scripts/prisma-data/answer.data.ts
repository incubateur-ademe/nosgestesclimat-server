import mongoose from 'mongoose'
import z from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import Answer from '../../src/schemas/_legacy/AnswerSchema'

const ByCategorySchema = z
  .object({
    transport: z.coerce.number().optional(),
    alimentation: z.number().optional(),
    logement: z.coerce.number().optional(),
    divers: z.coerce.number(),
    'services sociétaux': z.number().optional(),
    'services publics': z.number().optional(),
    numérique: z.coerce.number().optional(),
  })
  .strict()

const ContextSchema = z.union([
  z.object({}).strict(),
  z.record(
    z.string(),
    z.string().transform((value) => value.replace(/^\'|\'$/g, ''))
  ),
])

const AnswerSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    id: z.string().nullable(),
    survey: z.string(),
    data: z
      .object({
        total: z.number().nullable(),
        progress: z.number(),
        byCategory: ByCategorySchema,
        context: ContextSchema.nullable().optional(),
      })
      .strict(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const migrateAnswerToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const answers = Answer.find({}).lean().cursor({ batchSize: 1000 })

    for await (const rawAnswer of answers) {
      const answer = AnswerSchema.parse(rawAnswer)

      const { data, id, survey, updatedAt } = answer

      if (id === null) {
        logger.warn('Invalid answer without id found', {
          answer,
        })
        continue
      }

      const update = {
        survey,
        total: data.total || 0,
        progress: data.progress,
        byCategory: data.byCategory,
        createdAt: answer.createdAt,
        updatedAt,
        ...(!!data.context && Object.keys(data.context).length !== 0
          ? { context: data.context }
          : {}),
      }

      const existingAnswer = await prisma.answer.findFirst({
        where: {
          id,
          survey,
        },
      })

      if (!!existingAnswer?.updatedAt && existingAnswer.updatedAt > updatedAt) {
        logger.warn('Deduping answer for same survey', {
          existingAnswer,
        })
        continue
      }

      await prisma.answer.upsert({
        where: {
          id_survey: {
            id,
            survey,
          },
        },
        create: {
          id,
          ...update,
        },
        update,
      })
      documents++
    }

    logger.info('QuizzAnswers imported', { documents })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateAnswerToPg()
