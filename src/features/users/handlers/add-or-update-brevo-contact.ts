import {
  addOrUpdateContactAndAddToNewsletters,
  removeFromNewsletters,
} from '../../../adapters/brevo/client.js'
import type { Handler } from '../../../core/event-bus/handler.js'
import type { UserUpdatedEvent } from '../events/UserUpdated.event.js'

export const addOrUpdateBrevoContact: Handler<UserUpdatedEvent> = async ({
  attributes: {
    user: { email, ...user },
    newsletters: { newslettersToUnsubscribe, finalNewsletters },
    verified,
  },
}) => {
  if (!verified || !email) {
    return
  }

  if (newslettersToUnsubscribe.size) {
    await removeFromNewsletters({
      listIds: Array.from(newslettersToUnsubscribe),
      email,
    })
  }

  const listIds = Array.from(finalNewsletters)

  await addOrUpdateContactAndAddToNewsletters({
    listIds,
    email,
    user,
  })
}
