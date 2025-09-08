import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { ForbiddenException } from '../../core/errors/ForbiddenException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import logger from '../../logger.js'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware.js'
import {
  COOKIE_NAME,
  COOKIES_OPTIONS,
} from '../authentication/authentication.service.js'
import { UserUpdatedEvent } from './events/UserUpdated.event.js'
import { addOrUpdateBrevoContact } from './handlers/add-or-update-brevo-contact.js'
import { removePreviousBrevoContact } from './handlers/remove-previous-brevo-contact.js'
import { sendBrevoNewsLetterConfirmationEmail } from './handlers/send-brevo-newsletter-confirmation-email.js'
import {
  confirmNewsletterSubscriptions,
  fetchUserContact,
  updateUserAndContact,
} from './users.service.js'
import {
  FetchUserContactValidator,
  NewsletterConfirmationQuery,
  NewsletterConfirmationValidator,
  UpdateUserValidator,
  UserUpdateDto,
  UserUpdateQuery,
} from './users.validator.js'

const router = express.Router()

/**
 * Returns user contact for given user id
 */
router
  .route('/v1/:userId/contact')
  .get(validateRequest(FetchUserContactValidator), async (req, res) => {
    try {
      const contact = await fetchUserContact(req.params)

      return res.status(StatusCodes.OK).json(contact)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('User contact fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

EventBus.on(UserUpdatedEvent, addOrUpdateBrevoContact)
EventBus.on(UserUpdatedEvent, sendBrevoNewsLetterConfirmationEmail)
EventBus.on(UserUpdatedEvent, removePreviousBrevoContact)

/**
 * Upserts user for given user id
 */
router
  .route('/v1/:userId')
  .put(
    validateRequest(UpdateUserValidator),
    authentificationMiddleware({ passIfUnauthorized: true }),
    async (req, res) => {
      try {
        if (req.user && req.user.userId !== req.params.userId) {
          throw new ForbiddenException(`Different user ids found`)
        }

        const { user, verified, token } = await updateUserAndContact({
          params: req.user || req.params,
          code: UserUpdateQuery.parse(req.query).code,
          userDto: UserUpdateDto.parse(req.body),
          origin: req.get('origin') || config.origin,
        })

        if (token) {
          res.cookie(COOKIE_NAME, token, COOKIES_OPTIONS)
        }

        return verified
          ? res.status(StatusCodes.OK).json(user)
          : res.status(StatusCodes.ACCEPTED).json(user)
      } catch (err) {
        if (err instanceof EntityNotFoundException) {
          return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
        }

        if (err instanceof ForbiddenException) {
          return res.status(StatusCodes.FORBIDDEN).send(err.message).end()
        }

        logger.error('User update failed', err)

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
      }
    }
  )

router
  .route('/v1/:userId/newsletter-confirmation')
  .get(validateRequest(NewsletterConfirmationValidator), async (req, res) => {
    const redirectUrl = new URL(
      NewsletterConfirmationQuery.parse(req.query).origin
    )
    redirectUrl.pathname = '/newsletter-confirmation'
    const { searchParams: redirectSearchParams } = redirectUrl

    try {
      await confirmNewsletterSubscriptions({
        query: NewsletterConfirmationQuery.parse(req.query),
        origin: redirectUrl.origin,
        params: req.params,
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
