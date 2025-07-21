import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger.js'
import { createNorthStarRating } from './northstar-ratings.service.js'
import { NorthstarRatingCreateValidator } from './northstar-ratings.validator.js'

const router = express.Router()

/**
 * Creates a new northstar rating
 */
router
  .route('/v1/')
  .post(validateRequest(NorthstarRatingCreateValidator), async (req, res) => {
    try {
      const northStarRating = await createNorthStarRating(req.body)

      return res.status(StatusCodes.CREATED).json(northStarRating)
    } catch (err) {
      logger.error('NorthstarRating creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
