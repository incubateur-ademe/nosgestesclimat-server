import { VerificationCodeMode } from '@prisma/client'
import { sendWelcomeEmail } from '../../../adapters/brevo/client.js'
import type { Handler } from '../../../core/event-bus/handler.js'
import type { LoginEvent } from '../events/Login.event.js'

export const sendBrevoWelcomeEmail: Handler<LoginEvent> = ({
  attributes: {
    verificationCode: { email, mode },
    locale,
    origin,
  },
}) => {
  if (mode === VerificationCodeMode.signUp) {
    return sendWelcomeEmail({ email, origin, locale })
  }
}
