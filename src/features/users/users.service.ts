import type { Request } from 'express'
import { transferOwnershipToUser } from './users.repository'

export const syncUserData = (user: NonNullable<Request['user']>) => {
  return transferOwnershipToUser(user)
}
