import { EventBusEvent } from '../../../core/event-bus/event.js'
import type { Locales } from '../../../core/i18n/constant.js'
import type { UserVerificationCode } from '../verification-codes.repository.js'
export class LoginEvent extends EventBusEvent<{
  verificationCode: UserVerificationCode
  locale: Locales
  origin: string
}> {
  name = 'LoginEvent'
}
