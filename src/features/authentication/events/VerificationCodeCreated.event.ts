import type { VerificationCode } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import type { Locales } from '../../../core/i18n/constant.js'

export class VerificationCodeCreatedEvent extends EventBusEvent<{
  verificationCode: VerificationCode
  locale: Locales
  origin: string
}> {
  name = 'VerificationCodeCreatedEvent'
}
