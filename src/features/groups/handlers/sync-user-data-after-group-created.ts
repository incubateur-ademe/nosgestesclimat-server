import type { Handler } from '../../../core/event-bus/handler'
import { syncUserData } from '../../users/users.service'
import type { GroupCreatedEvent } from '../events/GroupCreated.event'

export const syncUserDataAfterGroupCreated: Handler<GroupCreatedEvent> = ({
  attributes: {
    administrator: { id: userId, email },
  },
}) => {
  if (!email) {
    return
  }

  return syncUserData({
    userId,
    email,
  })
}
