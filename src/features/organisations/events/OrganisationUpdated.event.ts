import { EventBusEvent } from '../../../core/event-bus/event'
import type { updateAdministratorOrganisation } from '../organisations.repository'

export class OrganisationUpdatedEvent extends EventBusEvent<{
  organisation: Awaited<
    ReturnType<typeof updateAdministratorOrganisation>
  >['organisation']
  administrator: Awaited<
    ReturnType<typeof updateAdministratorOrganisation>
  >['administrator']
}> {}
