import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { config } from '../../config.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import logger from '../../logger.js'
import { validateRequest } from '../../middlewares/validateRequest.js'
import {
  COOKIE_NAME,
  COOKIES_OPTIONS,
  login,
} from './authentication.service.js'
import { LoginValidator } from './authentication.validator.js'
import { LoginEvent } from './events/Login.event.js'
import { sendBrevoWelcomeEmail } from './handlers/send-welcome-email.js'
import { storeVerifiedUser } from './handlers/store-verified-user.js'
import { updateBrevoContact } from './handlers/update-brevo-contact.js'

const router = express.Router()

EventBus.on(LoginEvent, updateBrevoContact)
EventBus.on(LoginEvent, sendBrevoWelcomeEmail)
EventBus.on(LoginEvent, storeVerifiedUser)

/**
 * Logs a user in
 */
router
  .route('/v1/login')
  .post(validateRequest(LoginValidator), async (req, res) => {
    try {
      const { token, userId } = await login({
        loginDto: req.body,
        origin: req.get('origin') || config.app.origin,
        locale: req.query.locale,
      })

      res.cookie(COOKIE_NAME, token, COOKIES_OPTIONS)

      return res.status(StatusCodes.OK).json({ userId })
    } catch (err) {
      if (err instanceof EntityNotFoundException) {
        return res.status(StatusCodes.UNAUTHORIZED).end()
      }

      logger.error('Login failed', err)

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
    }
  })

/**
 * Logs a user out
 */
router.route('/v1/logout').post((_, res) => {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
    })

    return res.status(StatusCodes.OK).end()
  } catch (err) {
    logger.error('Logout failed', err)

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
  }
})

export default router
