import { VerificationCodeMode } from '@prisma/client'
import { prisma } from '../../../adapters/prisma/client.js'
import type { Handler } from '../../../core/event-bus/handler.js'
import { createVerifiedUser } from '../../users/users.repository.js'
import type { LoginEvent } from '../events/Login.event.js'
import { invalidateVerificationCode } from '../verification-codes.repository.js'

export const storeVerifiedUser: Handler<LoginEvent> = ({
  attributes: {
    verificationCode: { id, email, mode, userId },
  },
}) => {
  if (mode === VerificationCodeMode.signUp) {
    return Promise.all([
      createVerifiedUser({ email, userId }, { session: prisma }),
      invalidateVerificationCode({ id }, { session: prisma }),
    ])
  }
}
