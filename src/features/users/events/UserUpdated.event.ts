import type { User } from '@prisma/client'
import type { BrevoContact } from '../../../adapters/brevo/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class UserUpdatedEvent extends EventBusEvent<{
  user: Pick<User, 'id' | 'name' | 'email'>
  newsletters: {
    newslettersToUnsubscribe: Set<number>
    finalNewsletters: Set<number>
  }
  previousContact?: BrevoContact
  nextEmail?: string | null
  verified?: boolean
}> {
  name = 'UserUpdatedEvent'
}
