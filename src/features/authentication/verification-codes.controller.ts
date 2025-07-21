import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { config } from '../../config.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import logger from '../../logger.js'
import { VerificationCodeCreatedEvent } from './events/VerificationCodeCreated.event.js'
import { sendVerificationCode } from './handlers/send-verification-code.js'
import { updateBrevoContact } from './handlers/update-brevo-contact.js'
import { createVerificationCode } from './verification-codes.service.js'
import {
  VerificationCodeCreateDto,
  VerificationCodeCreateValidator,
} from './verification-codes.validator.js'

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
      const verificationCode = await createVerificationCode({
        verificationCodeDto: VerificationCodeCreateDto.parse(req.body),
        origin: req.get('origin') || config.origin,
      })

      return res.status(StatusCodes.CREATED).json(verificationCode)
    } catch (err) {
      logger.error('VerificationCode creation failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

export default router
