import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { validateRequest } from 'zod-express-middleware'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import logger from '../../logger.js'
import {
  COOKIE_NAME,
  COOKIES_OPTIONS,
  login,
} from './authentication.service.js'
import { LoginDto, LoginValidator } from './authentication.validator.js'
import { LoginEvent } from './events/Login.event.js'
import { syncUserDataAfterLogin } from './handlers/sync-user-data-after-login.js'
import { updateBrevoContact } from './handlers/update-brevo-contact.js'

const router = express.Router()

EventBus.on(LoginEvent, updateBrevoContact)
EventBus.on(LoginEvent, syncUserDataAfterLogin)

/**
 * Logs a user in
 */
router
  .route('/v1/login')
  .post(validateRequest(LoginValidator), async (req, res) => {
    try {
      const token = await login(LoginDto.parse(req.body))

      res.cookie(COOKIE_NAME, token, COOKIES_OPTIONS)

      return res.status(StatusCodes.OK).end()
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
