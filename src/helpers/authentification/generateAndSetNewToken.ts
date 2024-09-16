import type { Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  COOKIES_OPTIONS,
} from '../../features/authentication/authentication.service'

export function generateAndSetNewToken(res: Response, email: string) {
  // Generate a new token
  const newToken = jwt.sign({ email }, config.security.jwt.secret, {
    expiresIn: COOKIE_MAX_AGE,
  })

  res.cookie(COOKIE_NAME, newToken, COOKIES_OPTIONS)
}
