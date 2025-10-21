import type { Prisma, VerificationCode } from '@prisma/client'
import type { Session } from '../../adapters/prisma/transaction.js'

export const createUserVerificationCode = (
  data: Prisma.VerificationCodeCreateInput,
  { session }: { session: Session }
) => {
  return session.verificationCode.create({
    data,
    select: {
      id: true,
      email: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      expirationDate: true,
    },
  })
}

export const findUserVerificationCode = (
  { userId, email, code }: Pick<VerificationCode, 'email' | 'code' | 'userId'>,
  { session }: { session: Session }
) => {
  return session.verificationCode.findFirstOrThrow({
    where: {
      code,
      email,
      userId,
      expirationDate: {
        gte: new Date(),
      },
    },
    select: {
      email: true,
      userId: true,
    },
  })
}
