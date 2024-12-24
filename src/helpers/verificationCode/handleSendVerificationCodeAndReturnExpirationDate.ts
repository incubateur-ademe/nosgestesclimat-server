import { generateVerificationCodeAndExpiration } from '../../features/authentication/authentication.service'
import { VerificationCode } from '../../schemas/VerificationCodeSchema'
import { sendVerificationCodeEmail } from '../email/sendVerificationCodeEmail'

type Props = {
  email: string
  userId: string
}

export async function handleSendVerificationCodeAndReturnExpirationDate({
  userId,
  email,
}: Props) {
  // Generate a random code
  const { code, expirationDate } = generateVerificationCodeAndExpiration()

  // Create a new verification code
  const verificationCodeCreated = new VerificationCode({
    code,
    expirationDate,
    email,
  })

  const verificationCodeSaved = await verificationCodeCreated.save()

  // Send the code by email
  await sendVerificationCodeEmail({
    email,
    userId,
    verificationCode: code,
  })

  return verificationCodeSaved
}
