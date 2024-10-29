import type { Organisation, Poll, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class PollCreatedEvent extends EventBusEvent<{
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
  poll: Poll
}> {}