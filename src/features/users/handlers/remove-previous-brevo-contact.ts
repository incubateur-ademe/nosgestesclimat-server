import { deleteContact } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { UserUpdatedEvent } from '../events/UserUpdated.event'

export const removePreviousBrevoContact: Handler<UserUpdatedEvent> = ({
  attributes: { previousContact, verified },
}) => {
  if (!verified || !previousContact) {
    return
  }

  return deleteContact(previousContact.email)
}
