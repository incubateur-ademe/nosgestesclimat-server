import type { User } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'

export class GroupCreatedEvent extends EventBusEvent<{
  administrator: Pick<User, 'id' | 'name' | 'email'>
  participants: Array<{ user: Pick<User, 'id' | 'email'> }>
  participantUser?: undefined
}> {
  name = 'GroupCreatedEvent'
}
