import type { Handler } from '../../../core/event-bus/handler'
import { syncUserData } from '../../users/users.service'
import type { LoginEvent } from '../events/Login.event'

export const syncUserDataAfterLogin: Handler<LoginEvent> = ({
  attributes: {
    verificationCode: { email, userId },
  },
}) => {
  if (userId) {
    return syncUserData({ email, userId })
  }
}
