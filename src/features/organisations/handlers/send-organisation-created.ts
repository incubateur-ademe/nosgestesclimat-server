import { sendOrganisationCreatedEmail } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { OrganisationCreatedEvent } from '../events/OrganisationCreated.event'

export const sendOrganisationCreated: Handler<OrganisationCreatedEvent> = ({
  attributes,
}) => sendOrganisationCreatedEmail(attributes)
