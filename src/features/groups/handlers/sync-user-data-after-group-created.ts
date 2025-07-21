import type { Handler } from '../../../core/event-bus/handler.js'
import { syncUserData } from '../../users/users.service.js'
import type { GroupCreatedEvent } from '../events/GroupCreated.event.js'

export const syncUserDataAfterGroupCreated: Handler<GroupCreatedEvent> = ({
  attributes: {
    administrator: { id: userId, email },
    participants: [participant],
  },
}) => {
  if (!email || !!participant) {
    return
  }

  return syncUserData({
    userId,
    email,
  })
}
