import dayjs from 'dayjs'
import type { CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import type { LoginDto } from './authentication.validator'
import { LoginEvent } from './events/Login.event'
import { findUserVerificationCode } from './verification-codes.repository'

export const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 61 // 2 months

export const COOKIES_OPTIONS: CookieOptions = {
  maxAge: COOKIE_MAX_AGE,
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
}

export const COOKIE_NAME = 'ngcjwt'

export const generateVerificationCodeAndExpiration = () => ({
  code: Math.floor(
    Math.pow(10, 5) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 5) - 1)
  ).toString(),
  expirationDate: dayjs().add(1, 'hour').toDate(),
})

export const exchangeCredentialsForToken = async (loginDto: LoginDto) => {
  try {
    const { email, userId } = await findUserVerificationCode(loginDto)

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
  const { email, token, userId } = await exchangeCredentialsForToken(loginDto)

  const loginEvent = new LoginEvent({ email, userId })

  EventBus.emit(loginEvent)

  await EventBus.once(loginEvent)

  return token
}
