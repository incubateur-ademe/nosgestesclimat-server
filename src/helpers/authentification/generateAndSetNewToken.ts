import type { Response } from 'express'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  COOKIES_OPTIONS,
} from '../../features/authentication/authentication.service'

export function generateAndSetNewToken(
  res: Response,
  { email, userId }: JwtPayload
) {
  // Generate a new token
  const newToken = jwt.sign({ email, userId }, config.security.jwt.secret, {
    expiresIn: COOKIE_MAX_AGE,
  })

  res.cookie(COOKIE_NAME, newToken, COOKIES_OPTIONS)
}
