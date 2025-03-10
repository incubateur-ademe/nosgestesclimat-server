import type { User } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class GroupUpdatedEvent extends EventBusEvent<{
  administrator: Pick<User, 'id' | 'name' | 'email'>
  participants: Array<{ user: Pick<User, 'id' | 'email'> }>
  participantUser?: User
}> {
  name = 'GroupUpdatedEvent'
}
