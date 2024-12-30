import jwt from 'jsonwebtoken'
import { config } from '../../../../config'
import { EntityNotFoundException } from '../../../../core/errors/EntityNotFoundException'
import { isPrismaErrorNotFound } from '../../../../core/typeguards/isPrismaError'
import { findUserVerificationCode } from '../../../authentication/verification-codes.repository'
import { createVerificationCode } from '../../../authentication/verification-codes.service'
import type {
  GenerateAPITokenRequestDto,
  RecoverApiTokenQuery,
} from './authentication.contract'
import { findIntegrationWhitelist } from './authentication.repository'

export const TOKEN_MAX_AGE = 1000 * 60 * 15 // 15 minutes

export const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 61 // 2 months

export const REFRESH_TOKEN_SCOPE = 'refresh-token' as const

export const generateApiToken = async ({
  generateApiTokenDto: { email },
  origin,
}: {
  generateApiTokenDto: GenerateAPITokenRequestDto
  origin: string
}) => {
  const [, emailDomain] = email.split('@')
  const emailWhitelist = await findIntegrationWhitelist({ emailDomain })
  const isValidEmail = emailWhitelist.some(
    ({ emailPattern }) =>
      emailPattern === email || emailPattern === `*@${emailDomain}`
  )

  if (isValidEmail) {
    await createVerificationCode({
      verificationCodeDto: {
        email,
      },
      origin,
    })
  }
}

export const exchangeCredentialsForToken = async (
  query: RecoverApiTokenQuery
) => {
  try {
    const { email } = await findUserVerificationCode({
      ...query,
      userId: null,
    })

    const [, emailDomain] = email.split('@')
    const emailWhitelist = await findIntegrationWhitelist({ emailDomain })

    const scopes = Array.from(
      new Set(emailWhitelist.map(({ apiScopeName }) => apiScopeName))
    )

    return {
      token: jwt.sign({ email, scopes }, config.security.jwt.secret, {
        expiresIn: TOKEN_MAX_AGE,
      }),
      refreshToken: jwt.sign(
        { email, scopes: [REFRESH_TOKEN_SCOPE] },
        config.security.jwt.secret,
        {
          expiresIn: REFRESH_TOKEN_MAX_AGE,
        }
      ),
    }
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('VerificationCode not found')
    }
    throw e
  }
}
