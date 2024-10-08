import { sendVerificationCodeEmail } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { VerificationCodeCreatedEvent } from '../events/VerificationCodeCreated.event'

export const sendVerificationCode: Handler<VerificationCodeCreatedEvent> = ({
  attributes,
}) => sendVerificationCodeEmail(attributes)
