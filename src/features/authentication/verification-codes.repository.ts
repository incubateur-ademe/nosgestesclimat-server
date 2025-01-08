import type { Prisma, VerificationCode } from '@prisma/client'
import { transaction } from '../../adapters/prisma/transaction'

export const createUserVerificationCode = (
  data: Prisma.VerificationCodeCreateInput
) => {
  return transaction((prismaSession) =>
    prismaSession.verificationCode.create({
      data: {
        ...data,
      },
      select: {
        id: true,
        email: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        expirationDate: true,
      },
    })
  )
}

export const findUserVerificationCode = ({
  userId,
  email,
  code,
}: Pick<VerificationCode, 'email' | 'code' | 'userId'>) => {
  return transaction((prismaSession) =>
    prismaSession.verificationCode.findFirstOrThrow({
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
  )
}
