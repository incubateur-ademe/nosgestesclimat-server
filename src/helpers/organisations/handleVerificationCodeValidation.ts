import { VerificationCode } from '../../schemas/VerificationCodeSchema'

type Props = {
  verificationCode: string
  email: string
}

export async function handleVerificationCodeValidation({
  verificationCode,
  email,
}: Props) {
  const verificationCodeFound = await VerificationCode.findOne(
    {
      email,
    },
    {},
    { sort: { createdAt: -1 } }
  )

  if (!verificationCodeFound) {
    throw new Error('No matching verification code found.')
  }

  // Validation of the code
  const now = new Date()

  if (verificationCodeFound.toObject().code !== verificationCode) {
    throw new Error('Invalid code.')
  }

  if (
    verificationCodeFound.toObject().expirationDate.getTime() < now.getTime()
  ) {
    throw new Error('Code expired.')
  }
}
