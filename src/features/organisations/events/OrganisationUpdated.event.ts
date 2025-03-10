import type { Organisation, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class OrganisationUpdatedEvent extends EventBusEvent<{
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
  administrator?: VerifiedUser
}> {
  name = 'OrganisationUpdatedEvent'
}
