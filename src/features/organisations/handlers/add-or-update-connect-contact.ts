import { addOrUpdateContact } from '../../../adapters/connect/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { OrganisationCreatedEvent } from '../events/OrganisationCreated.event'
import type { OrganisationUpdatedEvent } from '../events/OrganisationUpdated.event'

export const addOrUpdateConnectContact: Handler<
  OrganisationCreatedEvent | OrganisationUpdatedEvent
> = ({ attributes }) =>
  attributes.administrator && addOrUpdateContact(attributes.administrator)
