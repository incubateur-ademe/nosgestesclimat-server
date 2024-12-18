import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { fetchBrevoNewsletter } from './newsletter.service'
import { NewsletterFetchValidator } from './newsletter.validator'

const router = express.Router()

/**
 * Returns brevo newsletter fo given id
 */
router
  .route('/v1/:newsletterId')
  .get(validateRequest(NewsletterFetchValidator), async (req, res) => {
    try {
      const { status, body } = await fetchBrevoNewsletter(req.params)

      return res.status(status).json(body)
    } catch (err) {
      logger.error('Newsletter fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
