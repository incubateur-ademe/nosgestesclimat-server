import { EventBusEvent } from '../../../core/event-bus/event'
import type { createGroupAndUser } from '../groups.repository'

export class GroupCreatedEvent extends EventBusEvent<{
  group: Awaited<ReturnType<typeof createGroupAndUser>>
  origin: string
}> {}
