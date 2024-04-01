import dayjs from 'dayjs'
import { sendVerificationCodeEmail } from '../email/sendVerificationCodeEmail'
import { generateRandomNumberWithLength } from '../../utils/generateRandomNumberWithLength'
import { VerificationCode } from '../../schemas/VerificationCodeSchema'

type Props = {
  email: string
  userId?: string
}

export async function handleSendVerificationCodeAndReturnExpirationDate({
  email,
  userId,
}: Props) {
  // Generate a random code
  const verificationCode = generateRandomNumberWithLength(6)

  const expirationDate = dayjs().add(1, 'hour').toDate()

  // Create a new verification code
  const verificationCodeCreated = new VerificationCode({
    code: verificationCode,
    expirationDate,
    email,
  })

  const verificationCodeSaved = await verificationCodeCreated.save()

  // Send the code by email
  await sendVerificationCodeEmail({
    email,
    verificationCode,
  })

  return verificationCodeSaved
}
