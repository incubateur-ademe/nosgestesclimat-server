import { createVerificationCode } from '../../../authentication/verification-codes.service'
import type { GenerateAPITokenRequestDto } from './authentication.contract'
import { findIntegrationWhitelist } from './authentication.repository'

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
