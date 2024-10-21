import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { prisma } from '../adapters/prisma/client'
import { config } from '../config'
import { COOKIE_NAME } from '../features/authentication/authentication.service'
import { generateAndSetNewToken } from '../helpers/authentification/generateAndSetNewToken'
import logger from '../logger'

const isValidResult = (
  result?: string | JwtPayload | undefined
): result is JwtPayload & { email: string; userId?: string } =>
  typeof result === 'object' && 'email' in result

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

      const { email } = result
      let { userId } = result

      if (!userId) {
        try {
          const { id } = await prisma.verifiedUser.findUniqueOrThrow({
            where: {
              email: result.email,
            },
            select: {
              id: true,
            },
          })

          userId = id
        } catch (e) {
          logger.warn(`Could not find verified user for ${result.email}`, e)
        }
      }

      req.user = {
        email,
        userId: userId!,
      }

      // Generate a new token
      generateAndSetNewToken(res, req.user)

      next()
    })
  }
