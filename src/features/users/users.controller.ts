import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { UserUpdatedEvent } from './events/UserUpdated.event'
import { addOrUpdateBrevoContact } from './handlers/add-or-update-brevo-contact'
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

/**
 * Updates user for given user id
 */
router
  .route('/v1/:userId')
  .put(validateRequest(UpdateUserValidator), async (req, res) => {
    try {
      const contact = await updateUserAndContact({
        params: req.params,
        userDto: UserUpdateDto.parse(req.body),
      })

      return res.status(StatusCodes.OK).json(contact)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('User update failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
