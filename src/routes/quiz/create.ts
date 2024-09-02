import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import logger from '../../logger'
import { QuizAnswer } from '../../schemas/QuizAnswerSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Create a new quiz answer
 * It requires a simulationId, an answer, and isAnswerCorrect (can be 'correct', 'almost' or 'wrong')
 * It returns the id of the answer
 */
router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId
  const answer = req.body.answer
  const isAnswerCorrect: 'correct' | 'almost' | 'wrong' =
    req.body.isAnswerCorrect

  // If no simulationId, answer or isAnswerCorrect is provided, we return an error
  if (!simulationId) {
    return res.status(500).send('Error. A simulationId must be provided.')
  }
  if (!answer) {
    return res.status(500).send('Error. An answer must be provided.')
  }
  if (!isAnswerCorrect) {
    return res.status(500).send('Error. isAnswerCorrect must be provided.')
  }

  try {
    // We create and save a new quiz answer
    const quizAnswer = new QuizAnswer({
      answer,
      isAnswerCorrect,
      simulationId,
    })

    await quizAnswer.save()

    try {
      await prisma.quizzAnswer.upsert({
        where: {
          simulationId_answer: {
            simulationId,
            answer,
          },
        },
        create: {
          id: quizAnswer._id.toString(),
          isAnswerCorrect,
          simulationId,
          answer,
        },
        update: {
          isAnswerCorrect,
          simulationId,
          answer,
        },
      })
    } catch (error) {
      logger.error('postgre QuizzAnswers replication failed', error)
    }

    setSuccessfulJSONResponse(res)

    res.json(quizAnswer)

    console.log(`Quiz answer created: ${quizAnswer._id}`)
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while creating quiz answer.')
  }
})

/**
 * @deprecated should use features/quizz-answers instead
 */
export default router
