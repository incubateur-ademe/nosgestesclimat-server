import { Response } from 'express'
import { VerificationCode } from './../../schemas/VerificationCodeSchema'

type Props = {
  verificationCode: string
  res: Response
  email: string
}

export async function validateVerificationCode({
  verificationCode,
  res,
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
    return res.status(403).json('No matching verification code found.')
  }

  // Validation of the code
  const now = new Date()

  if (verificationCodeFound.toObject().code !== verificationCode) {
    return res.status(403).json('Invalid code.')
  }

  if (
    verificationCodeFound.toObject().expirationDate.getTime() < now.getTime()
  ) {
    return res.status(403).json('Code expired.')
  }
}
