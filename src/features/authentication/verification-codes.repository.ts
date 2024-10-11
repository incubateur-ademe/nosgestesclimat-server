import type { Prisma } from '@prisma/client'
import { prisma } from '../../adapters/prisma/client'
import type { LoginDto } from './authentication.validator'

export const createUserVerificationCode = (
  data: Prisma.VerificationCodeCreateInput
) => {
  return prisma.verificationCode.create({
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
}

export const findUserVerificationCode = ({ userId, email, code }: LoginDto) => {
  return prisma.verificationCode.findFirstOrThrow({
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
