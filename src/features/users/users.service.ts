import type { Request } from 'express'
import type { BrevoContact } from '../../adapters/brevo/client'
import { fetchContact, fetchContactOrThrow } from '../../adapters/brevo/client'
import { ListIds } from '../../adapters/brevo/constant'
import { prisma } from '../../adapters/prisma/client'
import { transaction } from '../../adapters/prisma/transaction'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isAuthenticated } from '../../core/typeguards/isAuthenticated'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import { findUserVerificationCode } from '../authentication/verification-codes.repository'
import { UserUpdatedEvent } from './events/UserUpdated.event'
import {
  fetchUser,
  transferOwnershipToUser,
  updateUser,
  updateVerifiedUser,
} from './users.repository'
import type {
  NewsletterConfirmationQuery,
  UserParams,
  UserUpdateDto,
} from './users.validator'

const REACHABLE_NEWSLETTER_LIST_IDS: ListIds[] = [
  ListIds.MAIN_NEWSLETTER,
  ListIds.TRANSPORT_NEWSLETTER,
  ListIds.LOGEMENT_NEWSLETTER,
]

const userToDto = (
  user: Awaited<ReturnType<typeof updateUser>> & {
    contact?: Awaited<ReturnType<typeof fetchContactOrThrow>>
  }
) => user

const getNewsletterMutation = ({
  contact,
  wantedNewsletters,
}: {
  contact?: BrevoContact
  wantedNewsletters?: ListIds[]
}) => {
  const newslettersToSubscribe = new Set<ListIds>()
  const newslettersToUnsubscribe = new Set<ListIds>()
  const subscribedNewsletters = new Set(contact?.listIds || [])
  let shouldVerifyEmail = false

  if (!wantedNewsletters) {
    return {
      shouldVerifyEmail,
      newslettersToUnsubscribe,
      finalNewsletters: subscribedNewsletters,
    }
  }

  if (!contact) {
    for (const newsletter of wantedNewsletters) {
      newslettersToSubscribe.add(newsletter)
    }

    shouldVerifyEmail = !!newslettersToSubscribe.size

    return {
      shouldVerifyEmail,
      newslettersToUnsubscribe,
      finalNewsletters: newslettersToSubscribe,
    }
  }

  const unWantedNewsletters = REACHABLE_NEWSLETTER_LIST_IDS.filter(
    (listId) => !wantedNewsletters.includes(listId)
  )

  for (const newsletter of wantedNewsletters) {
    if (!subscribedNewsletters.has(newsletter)) {
      newslettersToSubscribe.add(newsletter)
    }
  }

  for (const newsletter of unWantedNewsletters) {
    if (subscribedNewsletters.has(newsletter)) {
      newslettersToUnsubscribe.add(newsletter)
    }
  }

  shouldVerifyEmail =
    !!newslettersToSubscribe.size || !!newslettersToUnsubscribe.size

  return {
    shouldVerifyEmail,
    newslettersToUnsubscribe,
    finalNewsletters: new Set(
      [...newslettersToSubscribe, ...subscribedNewsletters].filter(
        (listId) => !newslettersToUnsubscribe.has(listId)
      )
    ),
  }
}

export const syncUserData = (user: NonNullable<Request['user']>) => {
  return transaction(
    (session) => transferOwnershipToUser(user, { session }),
    prisma
  )
}

export const fetchUserContact = async (params: UserParams) => {
  try {
    const user = await transaction(
      (session) => fetchUser(params, { session }),
      prisma
    )

    if (!user.email) {
      throw new EntityNotFoundException('Contact not found')
    }

    const contact = await fetchContact(user.email)

    if (!contact) {
      throw new EntityNotFoundException('Contact not found')
    }

    return contact
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Contact not found')
    }
    throw e
  }
}

export const updateUserAndContact = async ({
  params,
  userDto,
}: {
  params: UserParams | NonNullable<Request['user']>
  userDto: UserUpdateDto
}) => {
  const isVerifiedUser = isAuthenticated(params)

  const { user, contact, newsletters, verified } = await transaction(
    async (session) => {
      const user = await (isVerifiedUser
        ? updateVerifiedUser(params, userDto, { session })
        : updateUser(params, userDto, { session }))

      let contact: BrevoContact | undefined
      if (user.email) {
        contact = await fetchContact(user.email)
      }

      const newsletters = getNewsletterMutation({
        contact,
        wantedNewsletters: userDto.contact?.listIds,
      })

      const verified =
        isVerifiedUser || !newsletters.shouldVerifyEmail || !user.email

      if (!verified && !!newsletters.newslettersToUnsubscribe.size) {
        throw new ForbiddenException(
          'Could not unsubscribe without verified email'
        )
      }

      return {
        user,
        contact,
        verified,
        newsletters,
      }
    }
  )

  const userUpdatedEvent = new UserUpdatedEvent({
    newsletters,
    verified,
    user,
  })

  EventBus.emit(userUpdatedEvent)

  await EventBus.once(userUpdatedEvent)

  return {
    verified: verified,
    user: userToDto({
      ...user,
      ...(user.email
        ? {
            contact: verified ? await fetchContactOrThrow(user.email) : contact,
          }
        : {}),
    }),
  }
}

export const confirmNewsletterSubscriptions = async ({
  params,
  query,
}: {
  params: UserParams
  query: NewsletterConfirmationQuery
}) => {
  try {
    const [user, contact] = await transaction(
      (session) =>
        Promise.all([
          fetchUser(params, { session }),
          fetchContact(query.email),
          findUserVerificationCode(
            {
              ...params,
              ...query,
            },
            { session }
          ),
        ]),
      prisma
    )

    const newsletters = getNewsletterMutation({
      contact,
      wantedNewsletters: query.listIds,
    })

    const userUpdatedEvent = new UserUpdatedEvent({
      verified: true,
      newsletters,
      user,
    })

    EventBus.emit(userUpdatedEvent)

    await EventBus.once(userUpdatedEvent)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Verification code not found')
    }
    throw e
  }
}
