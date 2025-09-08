import type { Organisation, Poll, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import { sanitizeOrganisationAdministratorName } from './event.mapper.js'

export type PollUpdatedEventAttributes = {
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
  poll: Poll
}

export class PollUpdatedEvent extends EventBusEvent<PollUpdatedEventAttributes> {
  name = 'PollUpdatedEvent'

  constructor(attributes: PollUpdatedEventAttributes) {
    super(sanitizeOrganisationAdministratorName(attributes))
  }
}
