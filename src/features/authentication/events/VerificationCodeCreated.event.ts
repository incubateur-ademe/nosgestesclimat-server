import type { VerificationCode } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'

export class VerificationCodeCreatedEvent extends EventBusEvent<{
  verificationCode: VerificationCode
  origin: string
}> {
  name = 'VerificationCodeCreatedEvent'
}
