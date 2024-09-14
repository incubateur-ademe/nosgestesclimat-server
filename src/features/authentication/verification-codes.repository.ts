import type { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { prisma } from '../../adapters/prisma/client'

export const createUserVerificationCode = (
  data: Prisma.VerificationCodeCreateInput
) => {
  return prisma.verificationCode.create({
    data: {
      id: randomUUID(),
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
}
