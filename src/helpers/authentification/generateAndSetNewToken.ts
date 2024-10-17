import type { Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { COOKIE_MAX_AGE, COOKIES_OPTIONS } from '../../constants/cookies'

export function generateAndSetNewToken(res: Response, email: string) {
  // Generate a new token
  const newToken = jwt.sign({ email }, config.security.jwt.secret, {
    expiresIn: COOKIE_MAX_AGE,
  })

  res.cookie('ngcjwt', newToken, COOKIES_OPTIONS)
}
