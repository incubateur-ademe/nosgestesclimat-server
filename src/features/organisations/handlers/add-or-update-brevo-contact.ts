import { addOrUpdateContactAfterOrganisationChange } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { OrganisationCreatedEvent } from '../events/OrganisationCreated.event'
import type { OrganisationUpdatedEvent } from '../events/OrganisationUpdated.event'
import type { PollCreatedEvent } from '../events/PollCreated.event'
import type { PollDeletedEvent } from '../events/PollDeletedEvent'
import type { PollUpdatedEvent } from '../events/PollUpdated.event'
import { getLastPollParticipantsCount } from '../organisations.repository'

export const addOrUpdateBrevoContact: Handler<
  | OrganisationCreatedEvent
  | OrganisationUpdatedEvent
  | PollCreatedEvent
  | PollUpdatedEvent
  | PollDeletedEvent
> = async (event) => {
  const {
    attributes: {
      organisation: {
        id: organisationId,
        name: organisationName,
        slug,
        administrators: [
          {
            user: {
              email,
              name: administratorName,
              optedInForCommunications,
              id: userId,
            },
          },
        ],
      },
    },
  } = event

  return addOrUpdateContactAfterOrganisationChange({
    slug,
    email,
    userId,
    organisationName,
    administratorName,
    optedInForCommunications,
    lastPollParticipantsCount:
      await getLastPollParticipantsCount(organisationId),
  })
}
