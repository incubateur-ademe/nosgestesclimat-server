import dayjs from 'dayjs'
import type { Session } from '../../adapters/prisma/transaction.js'
import { transaction } from '../../adapters/prisma/transaction.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import type { Locales } from '../../core/i18n/constant.js'
import type { WithOptionalProperty } from '../../types/types.js'
import { generateRandomVerificationCode } from './authentication.service.js'
import { VerificationCodeCreatedEvent } from './events/VerificationCodeCreated.event.js'
import { createUserVerificationCode } from './verification-codes.repository.js'
import type { VerificationCodeCreateDto } from './verification-codes.validator.js'

export const generateVerificationCode = async (
  {
    verificationCodeDto,
    expirationDate = dayjs().add(1, 'hour').toDate(),
  }: {
    verificationCodeDto: WithOptionalProperty<
      VerificationCodeCreateDto,
      'userId'
    >
    expirationDate?: Date
  },
  { session }: { session?: Session } = {}
) => {
  const code = generateRandomVerificationCode()

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
    locale,
  }: {
    verificationCodeDto: Pick<VerificationCodeCreateDto, 'email'>
    origin: string
    locale: Locales
  },
  session: { session?: Session } = {}
) => {
  const { verificationCode, code } = await generateVerificationCode(
    { verificationCodeDto },
    session
  )

  const verificationCodeCreatedEvent = new VerificationCodeCreatedEvent({
    verificationCode: {
      ...verificationCode,
      code,
    },
    locale,
    origin,
  })

  EventBus.emit(verificationCodeCreatedEvent)

  await EventBus.once(verificationCodeCreatedEvent)

  return verificationCode
}
