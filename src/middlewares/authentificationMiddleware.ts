import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  COOKIES_OPTIONS,
} from '../features/authentication/authentication.service.js'
import { syncUserData } from '../features/users/users.service.js'
import logger from '../logger.js'

const isValidResult = (
  result?: string | JwtPayload | undefined
): result is JwtPayload & { email: string; userId: string } =>
  typeof result === 'object' && 'email' in result && 'userId' in result

export const authentificationMiddleware =
  ({
    passIfUnauthorized,
  }: { passIfUnauthorized?: true } = {}): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const cookiesHeader = req.headers.cookie

    const token =
      cookiesHeader &&
      cookiesHeader
        .split(';')
        .map((c) => c.trim())
        .find((cookie) => cookie.startsWith(COOKIE_NAME))
        ?.replace(`${COOKIE_NAME}=`, '')

    if (!token) {
      return passIfUnauthorized
        ? next()
        : res.status(StatusCodes.UNAUTHORIZED).end()
    }

    jwt.verify(token, config.security.jwt.secret, async (err, result) => {
      if (err || !isValidResult(result)) {
        return passIfUnauthorized
          ? next()
          : res.status(StatusCodes.UNAUTHORIZED).end()
      }

      const { email, userId } = result

      if (passIfUnauthorized && userId === req.params.userId) {
        try {
          await syncUserData({ userId, email })
        } catch (err) {
          logger.error('Sync user data failed', err)

          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).end()
        }
      }

      req.user = {
        email,
        userId,
      }

      const newToken = jwt.sign({ email, userId }, config.security.jwt.secret, {
        expiresIn: COOKIE_MAX_AGE,
      })

      res.cookie(COOKIE_NAME, newToken, COOKIES_OPTIONS)

      next()
    })
  }
