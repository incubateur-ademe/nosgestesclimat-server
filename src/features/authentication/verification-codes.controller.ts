import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import logger from '../../logger'
import { createVerificationCode } from './verification-codes.service'
import { VerificationCodeCreateValidator } from './verification-codes.validator'

const router = express.Router()

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
