import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { config } from '../../config.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import logger from '../../logger.js'
import { rateLimitSameRequestMiddleware } from '../../middlewares/rateLimitSameRequestMiddleware.js'
import { validateRequest } from '../../middlewares/validateRequest.js'
import {
  confirmNewsletterSubscriptions,
  sendNewsletterConfirmationEmail,
  updateNewslettersInscription,
} from './newsletter.service.js'
import {
  NewsletterConfirmationValidator,
  NewsletterInscriptionValidator,
} from './newsletter.validator.js'

const router = express.Router()

/**
 * Returns brevo newsletter fo given id
 */
router
  .route('/v1/inscription')

  .post(
    rateLimitSameRequestMiddleware({
      ttlInSeconds: 30,
      hashRequest: ({ method, url, body }) => {
        if (!body.email) {
          return
        }
        return `${method}_${url}_${body.email}`
      },
    }),
    validateRequest(NewsletterInscriptionValidator),
    async (req, res) => {
      const origin = req.get('origin') || config.app.origin
      try {
        if (req.user) {
          // No need for confirmation for authentified users
          await updateNewslettersInscription({
            email: req.user.email,
            listIds: req.body.listIds,
          })
        } else {
          await sendNewsletterConfirmationEmail({
            inscriptionDto: req.body,
            origin,
          })
        }
        return res.status(StatusCodes.OK).end()
      } catch (err) {
        logger.error('Newsletter inscription failed', err)
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

router
  .route('/v1/confirmation')
  .get(validateRequest(NewsletterConfirmationValidator), async (req, res) => {
    const redirectUrl = new URL(req.query.origin)
    redirectUrl.pathname = '/newsletter-confirmation'
    const { searchParams: redirectSearchParams } = redirectUrl

    try {
      await confirmNewsletterSubscriptions({
        query: req.query,
      })

      redirectSearchParams.append('success', 'true')
    } catch (err) {
      const expired = err instanceof EntityNotFoundException

      if (!expired) {
        logger.error('Newsletter confirmation failed', err)
      }

      redirectSearchParams.append('success', 'false')
      redirectSearchParams.append(
        'status',
        (expired
          ? StatusCodes.NOT_FOUND
          : StatusCodes.INTERNAL_SERVER_ERROR
        ).toString()
      )
    }

    return res.redirect(redirectUrl.toString())
  })

export default router
