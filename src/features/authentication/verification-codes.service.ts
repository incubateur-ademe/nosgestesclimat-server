import dayjs from 'dayjs'
import { createUserVerificationCode } from './verification-codes.repository'
import type { VerificationCodeCreateDto } from './verification-codes.validator'

export const generateVerificationCodeAndExpiration = () => ({
  code: Math.floor(
    Math.pow(10, 5) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 5) - 1)
  ).toString(),
  expirationDate: dayjs().add(1, 'hour').toDate(),
})

export const createVerificationCode = (
  verificationCodeDto: VerificationCodeCreateDto
) => {
  return createUserVerificationCode({
    ...verificationCodeDto,
    ...generateVerificationCodeAndExpiration(),
  })
}
