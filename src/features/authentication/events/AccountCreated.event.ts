import type { VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
export class AccountCreatedEvent extends EventBusEvent<{
  user: Pick<VerifiedUser, 'id' | 'email'>
}> {
  name = 'AccountCreatedEvent'
}
