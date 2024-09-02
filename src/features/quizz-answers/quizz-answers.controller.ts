import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { createNorthStarRating } from './quizz-answers.service'
import { QuizzAnswerCreateValidator } from './quizz-answers.validator'

const router = express.Router()

/**
 * Creates a new northstar rating
 */
router
  .route('/')
  .post(validateRequest(QuizzAnswerCreateValidator), async (req, res) => {
    try {
      const quizzAnswer = await createNorthStarRating(req.body)

      return res.status(StatusCodes.CREATED).json(quizzAnswer)
    } catch (err) {
      logger.error('QuizzAnswer creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
