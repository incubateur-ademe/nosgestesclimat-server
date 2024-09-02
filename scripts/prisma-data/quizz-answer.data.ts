import mongoose from 'mongoose'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import { QuizAnswer } from '../../src/schemas/QuizAnswerSchema'

const migrateQuizzAnswerToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const quizzAnswers = QuizAnswer.find({}).lean().cursor({ batchSize: 1000 })

    for await (const quizzAnswer of quizzAnswers) {
      const id = quizzAnswer._id.toString()
      const simulationId = quizzAnswer.simulationId!
      const updatedAt = quizzAnswer.updatedAt
      const answer = quizzAnswer.answer!
      const update = {
        simulationId,
        isAnswerCorrect: quizzAnswer.isAnswerCorrect as 'correct',
        answer,
        createdAt: quizzAnswer.createdAt,
        updatedAt,
      }

      const existingQuizzAnswer = await prisma.quizzAnswer.findFirst({
        where: {
          simulationId,
          answer,
        },
      })

      if (
        !!existingQuizzAnswer?.updatedAt &&
        existingQuizzAnswer.updatedAt > updatedAt
      ) {
        logger.warn('Deduping answer for same simulation', {
          existingQuizzAnswer,
        })
        continue
      }

      await prisma.quizzAnswer.upsert({
        where: {
          simulationId_answer: {
            simulationId,
            answer,
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

migrateQuizzAnswerToPg()
