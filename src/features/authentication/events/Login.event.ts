import type { VerificationCode } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'

export class LoginEvent extends EventBusEvent<{
  verificationCode: Pick<VerificationCode, 'email' | 'userId'>
}> {
  name = 'LoginEvent'
}
