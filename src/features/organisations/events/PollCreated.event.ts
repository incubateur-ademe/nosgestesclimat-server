import type { Organisation, Poll, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import { sanitizeOrganisationAdministratorName } from './event.mapper.js'

export type PollCreatedEventAttributes = {
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
  poll: Poll
}

export class PollCreatedEvent extends EventBusEvent<PollCreatedEventAttributes> {
  name = 'PollCreatedEvent'

  constructor(attributes: PollCreatedEventAttributes) {
    super(sanitizeOrganisationAdministratorName(attributes))
  }
}
