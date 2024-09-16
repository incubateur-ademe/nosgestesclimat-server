import type { VerificationCode } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class VerificationCodeCreatedEvent extends EventBusEvent<VerificationCode> {}
