import type {
  Prisma,
  VerificationCode,
  VerificationCodeMode,
} from '@prisma/client'
import type { Session } from '../../adapters/prisma/transaction.js'

type SignVerificationCode = {
  id: string
  email: string
  userId: string
  mode: VerificationCodeMode
}

type RegisterOrganisationVerificationCode = {
  id: string
  email: string
  userId: string
  mode?: undefined
}

type RegisterApiVerificationCode = {
  id: string
  email: string
  userId: null
  mode?: undefined
}

export type UserVerificationCode =
  | SignVerificationCode
  | RegisterOrganisationVerificationCode
  | RegisterApiVerificationCode

export const createUserVerificationCode = (
  data: Prisma.VerificationCodeCreateInput,
  { session }: { session: Session }
) => {
  return session.verificationCode.create({
    data,
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      expirationDate: true,
    },
  })
}

export const findUserVerificationCode = (
  { email, code }: Pick<VerificationCode, 'email' | 'code'>,
  { session }: { session: Session }
): Promise<UserVerificationCode> => {
  return session.verificationCode.findFirstOrThrow({
    where: {
      code,
      email,
      expirationDate: {
        gte: new Date(),
      },
    },
    select: {
      id: true,
      email: true,
      userId: true,
      mode: true,
    },
  }) as Promise<UserVerificationCode>
}

export const invalidateVerificationCode = (
  { id }: Pick<VerificationCode, 'id'>,
  { session }: { session: Session }
) => {
  return session.verificationCode.update({
    where: { id },
    data: {
      expirationDate: new Date(Date.now() - 1),
    },
  })
}
