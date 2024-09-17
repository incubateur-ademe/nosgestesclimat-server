import { addOrUpdateContact } from '../../../adapters/connect/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { OrganisationCreatedEvent } from '../events/OrganisationCreated.event'

export const addOrUpdateConnectContact: Handler<OrganisationCreatedEvent> = ({
  attributes,
}) => addOrUpdateContact(attributes.administrator)
