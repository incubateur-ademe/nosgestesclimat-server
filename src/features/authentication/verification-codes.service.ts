import { EventBus } from '../../core/event-bus/event-bus'
import { generateVerificationCodeAndExpiration } from './authentication.service'
import { VerificationCodeCreatedEvent } from './events/VerificationCodeCreated.event'
import { createUserVerificationCode } from './verification-codes.repository'
import type { VerificationCodeCreateDto } from './verification-codes.validator'

export const createVerificationCode = async (
  verificationCodeDto: VerificationCodeCreateDto
) => {
  const { code, expirationDate } = generateVerificationCodeAndExpiration()

  const verificationCode = await createUserVerificationCode({
    ...verificationCodeDto,
    code,
    expirationDate,
  })

  const verificationCodeCreatedEvent = new VerificationCodeCreatedEvent({
    verificationCode: {
      ...verificationCode,
      code,
    },
  })

  EventBus.emit(verificationCodeCreatedEvent)

  await EventBus.once(verificationCodeCreatedEvent)

  return verificationCode
}
