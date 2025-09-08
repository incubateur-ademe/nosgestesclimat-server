import type { Organisation, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import { sanitizeOrganisationAdministratorName } from './event.mapper.js'

export type OrganisationUpdatedEventAttributes = {
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
  administrator?: VerifiedUser
}

export class OrganisationUpdatedEvent extends EventBusEvent<OrganisationUpdatedEventAttributes> {
  name = 'OrganisationUpdatedEvent'

  constructor(attributes: OrganisationUpdatedEventAttributes) {
    super(sanitizeOrganisationAdministratorName(attributes))
  }
}
