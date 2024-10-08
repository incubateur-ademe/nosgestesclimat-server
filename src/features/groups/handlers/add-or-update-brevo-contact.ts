import { addOrUpdateContactAfterGroupChange } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { GroupCreatedEvent } from '../events/GroupCreated.event'
import type { GroupDeletedEvent } from '../events/GroupDeleted.event'
import type { GroupUpdatedEvent } from '../events/GroupUpdated.event'
import { getAdministratorGroupsStats } from '../groups.repository'

export const addOrUpdateBrevoContact: Handler<
  GroupCreatedEvent | GroupUpdatedEvent | GroupDeletedEvent
> = async ({
  attributes: {
    administrator: { email, id, name },
    participants,
    participant,
  },
}) => {
  if (
    !email ||
    (!participants?.some(({ user }) => user.id === id) &&
      participant?.userId !== id)
  ) {
    return
  }

  return addOrUpdateContactAfterGroupChange({
    email,
    userId: id,
    administratorName: name,
    ...(await getAdministratorGroupsStats(id)),
  })
}
