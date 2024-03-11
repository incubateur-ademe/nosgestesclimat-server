import dayjs from 'dayjs'
import { sendVerificationCode } from '../email/sendVerificationCode'
import { generateRandomNumberWithLength } from '../../utils/generateRandomNumberWithLength'
import { VerificationCode } from '../../schemas/VerificationCodeSchema'

export async function handleSendVerificationCodeAndReturnExpirationDate(
  email: string
) {
  // Generate a random code
  const verificationCode = generateRandomNumberWithLength(6)

  const expirationDate = dayjs().add(1, 'hour').toDate()

  // Create a new verification code
  const verificationCodeCreated = new VerificationCode({
    code: verificationCode,
    expirationDate,
    email,
  })

  await verificationCodeCreated.save()

  // Send the code by email
  await sendVerificationCode({
    email,
    verificationCode,
  })

  return expirationDate
}
