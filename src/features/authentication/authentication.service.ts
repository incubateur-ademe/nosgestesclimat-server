import type { CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../../adapters/prisma/client.js'
import type { Session } from '../../adapters/prisma/transaction.js'
import { transaction } from '../../adapters/prisma/transaction.js'
import { config } from '../../config.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError.js'
import type { LoginDto } from './authentication.validator.js'
import { LoginEvent } from './events/Login.event.js'
import { findUserVerificationCode } from './verification-codes.repository.js'

export const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 61 // 2 months

export const COOKIES_OPTIONS: CookieOptions = {
  maxAge: COOKIE_MAX_AGE,
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
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
    const { email, userId } = await transaction(
      (session) => findUserVerificationCode(loginDto, { session }),
      session || prisma
    )

    return {
      email,
      userId,
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

export const login = async (loginDto: LoginDto) => {
  const { token, ...verificationCode } =
    await exchangeCredentialsForToken(loginDto)

  const loginEvent = new LoginEvent({
    verificationCode,
  })

  EventBus.emit(loginEvent)

  await EventBus.once(loginEvent)

  return token
}
