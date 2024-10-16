import { EventBusEvent } from '../../../core/event-bus/event'
import type { createOrganisationAndAdministrator } from '../organisations.repository'

export class OrganisationCreatedEvent extends EventBusEvent<{
  organisation: Awaited<
    ReturnType<typeof createOrganisationAndAdministrator>
  >['organisation']
  administrator: Awaited<
    ReturnType<typeof createOrganisationAndAdministrator>
  >['administrator']
  origin: string
}> {}
