import type { Organisation, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'

export class PollDeletedEvent extends EventBusEvent<{
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
}> {
  name = 'PollDeletedEvent'
}
