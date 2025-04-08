import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { UserUpdatedEvent } from './events/UserUpdated.event'
import { addOrUpdateBrevoContact } from './handlers/add-or-update-brevo-contact'
import { sendBrevoNewsLetterConfirmationEmail } from './handlers/send-brevo-newsletter-confirmation-email'
import { fetchUserContact, updateUserAndContact } from './users.service'
import {
  FetchUserContactValidator,
  UpdateUserValidator,
  UserUpdateDto,
} from './users.validator'

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

        const { user, verified } = await updateUserAndContact({
          params: req.user || req.params,
          userDto: UserUpdateDto.parse(req.body),
        })

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

export default router
