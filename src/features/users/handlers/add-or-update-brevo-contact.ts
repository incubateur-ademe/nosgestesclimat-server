import { addOrUpdateContactAndNewsLetterSubscriptions } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { UserUpdatedEvent } from '../events/UserUpdated.event'

export const addOrUpdateBrevoContact: Handler<UserUpdatedEvent> = async ({
  attributes: {
    user: { email, ...user },
    listIds,
  },
}) => {
  if (!email) {
    return
  }

  return addOrUpdateContactAndNewsLetterSubscriptions({
    listIds,
    email,
    user,
  })
}
