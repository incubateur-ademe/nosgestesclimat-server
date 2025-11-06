import type { CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../../adapters/prisma/client.js'
import type { Session } from '../../adapters/prisma/transaction.js'
import { transaction } from '../../adapters/prisma/transaction.js'
import { config } from '../../config.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import type { Locales } from '../../core/i18n/constant.js'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError.js'
import { createOrUpdateVerifiedUser } from '../users/users.repository.js'
import type { LoginDto } from './authentication.validator.js'
import { LoginEvent } from './events/Login.event.js'
import { findUserVerificationCode } from './verification-codes.repository.js'

const {
  app: { env },
} = config

export const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 61 // 2 months

export const COOKIES_OPTIONS: CookieOptions = {
  maxAge: COOKIE_MAX_AGE,
  httpOnly: true,
  secure: env === 'production',
  sameSite: env === 'production' ? 'none' : 'lax',
  partitioned: true,
}

export const COOKIE_NAME = 'ngcjwt'

export const generateRandomVerificationCode = () =>
  Math.floor(
    Math.pow(10, 5) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 5) - 1)
  ).toString()

export const exchangeCredentialsForToken = async (
  loginDto: LoginDto,
  { session }: { session?: Session } = {}
) => {
  try {
    const verificationCode = await transaction(
      (session) => findUserVerificationCode(loginDto, { session }),
      session || prisma
    )

    const { email, userId } = verificationCode

    return {
      verificationCode: verificationCode,
      token: jwt.sign({ email, userId }, config.security.jwt.secret, {
        expiresIn: COOKIE_MAX_AGE,
      }),
    }
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('VerificationCode not found')
    }
    throw e
  }
}

export const login = async ({
  loginDto,
  locale,
  origin,
}: {
  loginDto: LoginDto
  locale: Locales
  origin: string
}) => {
  const { token, verificationCode } = await transaction(async (session) => {
    const { token, verificationCode } = await exchangeCredentialsForToken(
      loginDto,
      { session }
    )

    if (verificationCode.userId) {
      await createOrUpdateVerifiedUser(
        {
          id: verificationCode,
          user: verificationCode,
        },
        { session }
      )
    }

    return {
      token,
      verificationCode,
    }
  })

  const loginEvent = new LoginEvent({
    verificationCode,
    locale,
    origin,
  })

  EventBus.emit(loginEvent)

  await EventBus.once(loginEvent)

  return token
}
