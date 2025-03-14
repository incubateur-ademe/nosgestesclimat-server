import { isAxiosError } from 'axios'
import type { Request } from 'express'
import { fetchContact, isNotFound } from '../../adapters/brevo/client'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import { UserUpdatedEvent } from './events/UserUpdated.event'
import {
  fetchUser,
  transferOwnershipToUser,
  updateUser,
} from './users.repository'
import type { UserParams, UserUpdateDto } from './users.validator'

const userToDto = (
  user: Awaited<ReturnType<typeof updateUser>> & {
    contact?: Awaited<ReturnType<typeof fetchContact>>
  }
) => user

export const syncUserData = (user: NonNullable<Request['user']>) => {
  return transferOwnershipToUser(user)
}

export const fetchUserContact = async (params: UserParams) => {
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

export const updateUserAndContact = async ({
  params,
  userDto,
}: {
  params: UserParams
  userDto: UserUpdateDto
}) => {
  try {
    const user = await updateUser(params, userDto)

    const userUpdatedEvent = new UserUpdatedEvent({
      listIds: userDto.contact?.listIds,
      user,
    })

    EventBus.emit(userUpdatedEvent)

    await EventBus.once(userUpdatedEvent)

    return userToDto({
      ...user,
      ...(user.email ? { contact: await fetchContact(user.email) } : {}),
    })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('User not found')
    }
    throw e
  }
}
