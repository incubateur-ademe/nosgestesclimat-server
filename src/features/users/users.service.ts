import { isAxiosError } from 'axios'
import type { Request } from 'express'
import {
  addOrUpdateContactAndNewsLetterSubscriptions,
  fetchContact,
  isNotFound,
} from '../../adapters/brevo/client'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import {
  fetchUser,
  transferOwnershipToUser,
  updateUser,
} from './users.repository'
import type { UserBrevoContactUpdateDto, UserParams } from './users.validator'

export const syncUserData = (user: NonNullable<Request['user']>) => {
  return transferOwnershipToUser(user)
}

export const fetchUserBrevoContact = async (params: UserParams) => {
  try {
    const user = await fetchUser(params)

    if (!user.email) {
      throw new EntityNotFoundException('Contact not found')
    }

    const contact = await fetchContact(user.email)

    return contact
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

export const updateUserBrevoContact = async ({
  params,
  contactDto,
}: {
  params: UserParams
  contactDto: UserBrevoContactUpdateDto
}) => {
  try {
    const user = await updateUser(params, contactDto)

    const contact = await addOrUpdateContactAndNewsLetterSubscriptions({
      ...contactDto,
      user,
    })

    return contact
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('User not found')
    }
    throw e
  }
}
