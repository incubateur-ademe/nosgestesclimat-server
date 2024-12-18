import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import logger from '../../logger'
import { fetchUserBrevoContact, updateUserBrevoContact } from './users.service'
import {
  FetchUserBrevoContactValidator,
  UpdateUserBrevoContactValidator,
} from './users.validator'

const router = express.Router()

/**
 * Returns brevo contact for given user id
 */
router
  .route('/v1/:userId/brevo-contact')
  .get(validateRequest(FetchUserBrevoContactValidator), async (req, res) => {
    try {
      const contact = await fetchUserBrevoContact(req.params)

      return res.status(StatusCodes.OK).json(contact)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('User brevo contact fetch failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Updates brevo contact for given user id
 */
router
  .route('/v1/:userId/brevo-contact')
  .put(validateRequest(UpdateUserBrevoContactValidator), async (req, res) => {
    try {
      const contact = await updateUserBrevoContact({
        params: req.params,
        contactDto: req.body,
      })

      return res.status(StatusCodes.OK).json(contact)
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.NOT_FOUND).send(err.message).end()
      }

      logger.error('User brevo contact update failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
