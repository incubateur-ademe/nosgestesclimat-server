import { sendNewsLetterConfirmationEmail } from '../../../adapters/brevo/client'
import { config } from '../../../config'
import type { Handler } from '../../../core/event-bus/handler'
import { generateVerificationCode } from '../../authentication/verification-codes.service'
import type { UserUpdatedEvent } from '../events/UserUpdated.event'

export const sendBrevoNewsLetterConfirmationEmail: Handler<
  UserUpdatedEvent
> = async ({
  attributes: {
    user: { id: userId },
    newsletters: { finalNewsletters },
    nextEmail: email,
    verified,
  },
}) => {
  if (verified || !email) {
    return
  }

  const { code } = await generateVerificationCode({ email, userId })

  return sendNewsLetterConfirmationEmail({
    newsLetterConfirmationBaseUrl: config.serverUrl,
    listIds: Array.from(finalNewsletters),
    userId,
    email,
    code,
  })
}
