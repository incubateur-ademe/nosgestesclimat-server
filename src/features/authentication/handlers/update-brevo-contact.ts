import { addOrUpdateContactAfterLogin } from '../../../adapters/brevo/client.js'
import type { Handler } from '../../../core/event-bus/handler.js'
import type { LoginEvent } from '../events/Login.event.js'
import type { VerificationCodeCreatedEvent } from '../events/VerificationCodeCreated.event.js'

export const updateBrevoContact: Handler<
  LoginEvent | VerificationCodeCreatedEvent
> = ({
  attributes: {
    verificationCode: { email, userId },
  },
}) => {
  if (userId) {
    return addOrUpdateContactAfterLogin({ email, userId })
  }
}
