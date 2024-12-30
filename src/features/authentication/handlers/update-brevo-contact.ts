import { addOrUpdateContactAfterLogin } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { LoginEvent } from '../events/Login.event'
import type { VerificationCodeCreatedEvent } from '../events/VerificationCodeCreated.event'

export const updateBrevoContact: Handler<
  LoginEvent | VerificationCodeCreatedEvent
> = ({ attributes: { email, userId } }) => {
  if (userId) {
    return addOrUpdateContactAfterLogin({ email, userId })
  }
}
