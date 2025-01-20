import type { User } from '@prisma/client'
import type { ListIds } from '../../../adapters/brevo/constant'
import { EventBusEvent } from '../../../core/event-bus/event'

export class UserUpdatedEvent extends EventBusEvent<{
  user: Pick<User, 'id' | 'name' | 'email'>
  listIds?: ListIds[]
}> {}
