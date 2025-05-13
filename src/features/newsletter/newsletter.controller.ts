import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { KEYS } from '../../adapters/redis/constant'
import logger from '../../logger'
import { redisCacheMiddleware } from '../../middlewares/redisCacheMiddleware'
import { fetchBrevoNewsletter } from './newsletter.service'
import { NewsletterFetchValidator } from './newsletter.validator'

const router = express.Router()

/**
 * Returns brevo newsletter fo given id
 */
router.route('/v1/:newsletterId').get(
  validateRequest(NewsletterFetchValidator),
  redisCacheMiddleware({
    key: (req) => `${KEYS.brevoNewsletter}_${req.params.newsletterId}`,
  }),
  async (req, res) => {
    try {
      const { status, body } = await fetchBrevoNewsletter(req.params)

      return res.status(status).json(body)
    } catch (err) {
      logger.error('Newsletter fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  }
)

export default router
