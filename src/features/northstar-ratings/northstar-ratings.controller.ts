import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { NorthstarRatingCreateValidator } from './northstar-ratings.validator'

const router = express.Router()

/**
 * Creates a new northstar rating
 */
router
  .route('/')
  .post(validateRequest(NorthstarRatingCreateValidator), (req, res) => {
    try {
      return res.sendStatus(StatusCodes.CREATED).json({})
    } catch (err) {
      logger.error('NorthstarRating creation failed', err)

      return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR).json({})
    }
  })

export default router
