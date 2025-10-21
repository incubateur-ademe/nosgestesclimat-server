import type { VerificationCode } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import type { Locales } from '../../../core/i18n/constant.js'

export class LoginEvent extends EventBusEvent<{
  verificationCode: Pick<VerificationCode, 'email' | 'userId' | 'mode'>
  locale: Locales
  origin: string
}> {
  name = 'LoginEvent'
}
