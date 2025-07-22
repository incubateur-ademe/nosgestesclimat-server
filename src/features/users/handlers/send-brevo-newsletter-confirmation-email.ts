import { sendNewsLetterConfirmationEmail } from '../../../adapters/brevo/client.js'
import { config } from '../../../config.js'
import type { Handler } from '../../../core/event-bus/handler.js'
import { generateVerificationCode } from '../../authentication/verification-codes.service.js'
import type { UserUpdatedEvent } from '../events/UserUpdated.event.js'

export const sendBrevoNewsLetterConfirmationEmail: Handler<
  UserUpdatedEvent
> = async ({
  attributes: {
    user: { id: userId },
    newsletters: { finalNewsletters },
    nextEmail: email,
    verified,
    origin,
  },
}) => {
  if (verified || !email) {
    return
  }

  const { code } = await generateVerificationCode({ email, userId })

  return sendNewsLetterConfirmationEmail({
    newsLetterConfirmationBaseUrl: config.serverUrl,
    listIds: Array.from(finalNewsletters),
    origin,
    userId,
    email,
    code,
  })
}
