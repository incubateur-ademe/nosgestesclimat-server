import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { KEYS } from '../../adapters/redis/constant.js'
import logger from '../../logger.js'
import { redisCacheMiddleware } from '../../middlewares/redisCacheMiddleware.js'
import { fetchBrevoNewsletter } from './newsletter.service.js'
import { NewsletterFetchValidator } from './newsletter.validator.js'

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
