import express from 'express'
import { validateRequest } from 'zod-express-middleware'
import { NorthstarRatingCreateValidator } from './northstar-ratings.validator'

const router = express.Router()

/**
 * Creates a new northstar rating
 */
router.route('/').post(validateRequest(NorthstarRatingCreateValidator))

export default router
