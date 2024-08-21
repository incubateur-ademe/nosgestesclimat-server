import type { CookieOptions } from 'express'
import { config } from '../config'

export const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 61 // 2 months

export const COOKIES_OPTIONS: CookieOptions = {
  maxAge: COOKIE_MAX_AGE,
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
}
