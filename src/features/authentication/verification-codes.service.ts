import type { Session } from '../../adapters/prisma/transaction.js'
import { transaction } from '../../adapters/prisma/transaction.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import type { WithOptionalProperty } from '../../types/types.js'
import { generateVerificationCodeAndExpiration } from './authentication.service.js'
import { VerificationCodeCreatedEvent } from './events/VerificationCodeCreated.event.js'
import { createUserVerificationCode } from './verification-codes.repository.js'
import type { VerificationCodeCreateDto } from './verification-codes.validator.js'

export const generateVerificationCode = async (
  verificationCodeDto: WithOptionalProperty<
    VerificationCodeCreateDto,
    'userId'
  >,
  { session }: { session?: Session } = {}
) => {
  const { code, expirationDate } = generateVerificationCodeAndExpiration()

  const verificationCode = await transaction(
    (session) =>
      createUserVerificationCode(
        {
          ...verificationCodeDto,
          code,
          expirationDate,
        },
        { session }
      ),
    session
  )

  return { code, verificationCode }
}

export const createVerificationCode = async (
  {
    verificationCodeDto,
    origin,
  }: {
    verificationCodeDto: Pick<VerificationCodeCreateDto, 'email'>
    origin: string
  },
  session: { session?: Session } = {}
) => {
  const { verificationCode, code } = await generateVerificationCode(
    verificationCodeDto,
    session
  )

  const verificationCodeCreatedEvent = new VerificationCodeCreatedEvent({
    verificationCode: {
      ...verificationCode,
      code,
    },
    origin,
  })

  EventBus.emit(verificationCodeCreatedEvent)

  await EventBus.once(verificationCodeCreatedEvent)

  return verificationCode
}
