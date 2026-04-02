import type { VerificationCodeMode, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import type { Locales } from '../../../core/i18n/constant.js'
export class LoginEvent extends EventBusEvent<{
  user: Pick<VerifiedUser, 'id' | 'email'>
  previousUserId: string
  mode: VerificationCodeMode
  locale: Locales
  origin: string
}> {
  name = 'LoginEvent'
}
