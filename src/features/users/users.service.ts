import { isAxiosError } from 'axios'
import type { Request } from 'express'
import { z } from 'zod'
import { fetchContact, isNotFound } from '../../adapters/brevo/client'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import { fetchUser, transferOwnershipToUser } from './users.repository'
import type { UserParams } from './users.validator'

const BrevoContactDtoSchema = z
  .object({
    id: z.number(),
    email: z.string(),
    listIds: z.array(z.number()),
  })
  .strict()

export const syncUserData = (user: NonNullable<Request['user']>) => {
  return transferOwnershipToUser(user)
}

export const fetchUserBrevoContact = async (params: UserParams) => {
  try {
    const user = await fetchUser(params)

    if (!user.email) {
      throw new EntityNotFoundException('Contact not found')
    }

    const {
      data: { id, email, listIds },
    } = await fetchContact(user.email)

    return BrevoContactDtoSchema.parse({
      id,
      email,
      listIds,
    })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Contact not found')
    }
    if (isAxiosError(e) && isNotFound(e)) {
      throw new EntityNotFoundException('Contact not found')
    }
    throw e
  }
}
