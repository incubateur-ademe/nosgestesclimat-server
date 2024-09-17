import { addOrUpdateContact } from '../../../adapters/brevo/client'
import { Attributes } from '../../../adapters/brevo/constant'
import type { Handler } from '../../../core/event-bus/handler'
import type { OrganisationCreatedEvent } from '../events/OrganisationCreated.event'

export const addOrUpdateBrevoContact: Handler<OrganisationCreatedEvent> = ({
  attributes: {
    administrator: {
      email,
      name: administratorName,
      optedInForCommunications,
      id,
    },
    organisation: { name: organisationName, slug },
  },
}) => {
  const attributes = {
    [Attributes.LAST_POLL_PARTICIPANTS_NUMBER]: 0, // TODO lastPoll simulations.length
    [Attributes.IS_ORGANISATION_ADMIN]: true,
    [Attributes.ORGANISATION_NAME]: organisationName,
    [Attributes.ORGANISATION_SLUG]: slug,
    [Attributes.USER_ID]: id,
    [Attributes.PRENOM]: administratorName,
    [Attributes.OPT_IN]: optedInForCommunications,
  }

  return addOrUpdateContact({
    email,
    attributes,
  })
}
