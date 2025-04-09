import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import { EventBus } from '../../core/event-bus/event-bus'
import type { WithOptionalProperty } from '../../types/types'
import { generateVerificationCodeAndExpiration } from './authentication.service'
import { VerificationCodeCreatedEvent } from './events/VerificationCodeCreated.event'
import { createUserVerificationCode } from './verification-codes.repository'
import type { VerificationCodeCreateDto } from './verification-codes.validator'

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
