import type { PrismaClient } from '@prisma/client'
import type { ITXClientDenyList } from '@prisma/client/runtime/library'
import { prisma } from './client'

export type Session = Omit<PrismaClient, ITXClientDenyList>

export const transaction = <R>(
  cb: (prisma: Session) => Promise<R>,
  session?: Session
): Promise<R> => {
  return (session ? cb(session) : prisma.$transaction(cb)) as Promise<R>
}
