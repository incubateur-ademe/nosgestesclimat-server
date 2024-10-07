import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EventBus } from '../../core/event-bus/event-bus'
import logger from '../../logger'
import { VerificationCodeCreatedEvent } from './events/VerificationCodeCreated.event'
import { sendVerificationCode } from './handlers/send-verification-code'
import { updateBrevoContact } from './handlers/update-brevo-contact'
import { createVerificationCode } from './verification-codes.service'
import { VerificationCodeCreateValidator } from './verification-codes.validator'

const router = express.Router()

EventBus.on(VerificationCodeCreatedEvent, sendVerificationCode)
EventBus.on(VerificationCodeCreatedEvent, updateBrevoContact)

/**
 * Creates a verification code
 */
router
  .route('/v1/')
  .post(validateRequest(VerificationCodeCreateValidator), async (req, res) => {
    try {
      const verificationCode = await createVerificationCode(req.body)

      return res.status(StatusCodes.CREATED).json(verificationCode)
    } catch (err) {
      logger.error('VerificationCode creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
