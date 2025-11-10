import type { Handler } from '../../../core/event-bus/handler.js'
import { syncUserData } from '../../users/users.service.js'
import type { LoginEvent } from '../events/Login.event.js'

export const syncUserDataAfterLogin: Handler<LoginEvent> = ({
  attributes: {
    verificationCode: { email, userId },
  },
}) => {
  if (userId) {
    return syncUserData({ user: { email, userId }, verified: true })
  }
}
