import type { User } from '@prisma/client'
import type { Request } from 'express'
import type { BrevoContact } from '../../adapters/brevo/client.js'
import {
  fetchContact,
  fetchContactOrThrow,
} from '../../adapters/brevo/client.js'
import { ListIds } from '../../adapters/brevo/constant.js'
import { prisma } from '../../adapters/prisma/client.js'
import {
  defaultUserSelection,
  defaultVerifiedUserSelection,
} from '../../adapters/prisma/selection.js'
import { transaction } from '../../adapters/prisma/transaction.js'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException.js'
import { ForbiddenException } from '../../core/errors/ForbiddenException.js'
import { EventBus } from '../../core/event-bus/event-bus.js'
import { isAuthenticated } from '../../core/typeguards/isAuthenticated.js'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError.js'
import {
  createToken,
  verifyCode,
} from '../authentication/authentication.service.js'
import { UserUpdatedEvent } from './events/UserUpdated.event.js'
import {
  createOrUpdateUser,
  createOrUpdateVerifiedUser,
  fetchUser,
  transferOwnershipToUser,
} from './users.repository.js'
import type {
  NewsletterConfirmationQuery,
  UserParams,
  UserUpdateDto,
} from './users.validator.js'

const REACHABLE_NEWSLETTER_LIST_IDS: ListIds[] = [
  ListIds.MAIN_NEWSLETTER,
  ListIds.TRANSPORT_NEWSLETTER,
  ListIds.LOGEMENT_NEWSLETTER,
]

const userToDto = (
  user: User & {
    contact?: BrevoContact
  }
) => user

const getNewsletterMutation = ({
  contact,
  previousContact,
  wantedNewsletters,
}: {
  contact?: BrevoContact
  previousContact?: BrevoContact
  wantedNewsletters?: number[]
}) => {
  const newslettersToSubscribe = new Set<number>()
  const newslettersToUnsubscribe = new Set<number>()
  const subscribedNewsletters = new Set<number>(
    previousContact ? previousContact.listIds : contact?.listIds || []
  )
  let shouldVerifyEmail =
    (!!previousContact && !!contact) ||
    (!!previousContact && !!subscribedNewsletters.size)

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

export const syncUserData = ({
  user,
  verified,
}: {
  user: { id: string; email: string }
  verified?: boolean
}) => {
  return transaction(
    (session) => transferOwnershipToUser({ user, verified }, { session }),
    prisma
  )
}

export const fetchUserContact = async (params: UserParams) => {
  try {
    const user = await transaction(
      (session) =>
        fetchUser(
          { id: params.userId, select: defaultUserSelection },
          { session, orThrow: true }
        ),
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

const getEmailMutation = <
  PreviousUser extends { email?: string | null },
  NextUser extends { email?: string | null },
>(
  nextUser: NextUser,
  previousUser?: PreviousUser | null
):
  | { emailChanged: true; previousEmail: string; nextEmail: string }
  | {
      emailChanged: false
      previousEmail?: string | null
      nextEmail?: string | null
    } => {
  const { email: nextEmail } = nextUser
  const previousEmail = previousUser?.email

  if (!!nextEmail && !!previousEmail && previousEmail !== nextEmail) {
    return {
      emailChanged: true,
      previousEmail,
      nextEmail,
    }
  }
  return {
    nextEmail: nextEmail || previousEmail,
    emailChanged: false,
    previousEmail,
  }
}

export const updateUserAndContact = async ({
  code,
  params,
  userDto,
  origin,
}: {
  params: UserParams | NonNullable<Request['user']>
  code?: string
  userDto: UserUpdateDto
  origin: string
}) => {
  const {
    user,
    contact,
    newsletters,
    nextEmail,
    verified,
    previousContact,
    token,
  } = await transaction(async (session) => {
    const isVerifiedUser = isAuthenticated(params)

    const previousUser = await (isVerifiedUser
      ? params
      : fetchUser(
          { id: params.userId, select: defaultUserSelection },
          { session }
        ))

    const { emailChanged, nextEmail, previousEmail } = getEmailMutation(
      userDto,
      previousUser
    )

    let token: string | undefined
    if (isVerifiedUser && emailChanged) {
      if (!code) {
        throw new ForbiddenException(
          'Forbidden ! Cannot update email without a verification code.'
        )
      }

      try {
        await verifyCode(
          {
            ...params,
            code,
            email: nextEmail,
          },
          { session }
        )
      } catch (e) {
        if (e instanceof EntityNotFoundException) {
          throw new ForbiddenException('Forbidden ! Invalid verification code.')
        }
        throw e
      }
    }

    let contact: BrevoContact | undefined
    let previousContact: BrevoContact | undefined
    if (nextEmail) {
      contact = await fetchContact(nextEmail)
      if (emailChanged) {
        previousContact = await fetchContact(previousEmail)
      }
    }

    const newsletters = getNewsletterMutation({
      contact,
      previousContact,
      wantedNewsletters: userDto.contact?.listIds,
    })

    const verified =
      isVerifiedUser || !newsletters.shouldVerifyEmail || !nextEmail

    if (!verified && !!newsletters.newslettersToUnsubscribe.size) {
      throw new ForbiddenException(
        'Could not unsubscribe without verified email'
      )
    }

    const update =
      verified || !emailChanged ? userDto : { ...userDto, email: previousEmail }

    let user
    if (isVerifiedUser) {
      user = (
        await createOrUpdateVerifiedUser(
          { id: params, user: update, select: defaultVerifiedUserSelection },
          { session }
        )
      ).user
      token = createToken(user)
    } else {
      user = (
        await createOrUpdateUser(
          {
            id: params.userId,
            user: update,
            select: defaultUserSelection,
          },
          { session }
        )
      ).user
    }

    return {
      user,
      token,
      contact,
      verified,
      nextEmail,
      newsletters,
      previousContact,
    }
  })

  const userUpdatedEvent = new UserUpdatedEvent({
    previousContact,
    newsletters,
    nextEmail,
    verified,
    origin,
    user,
  })

  EventBus.emit(userUpdatedEvent)

  await EventBus.once(userUpdatedEvent)

  return {
    token,
    verified,
    user: userToDto({
      ...user,
      ...(user.email
        ? {
            contact: verified
              ? await fetchContactOrThrow(user.email)
              : previousContact || contact,
          }
        : {}),
    }),
  }
}

export const confirmNewsletterSubscriptions = async ({
  params,
  origin,
  query,
}: {
  params: UserParams
  origin: string
  query: NewsletterConfirmationQuery
}) => {
  try {
    const [user, contact] = await transaction(
      (session) =>
        Promise.all([
          fetchUser(
            { id: params.userId, select: defaultUserSelection },
            { session, orThrow: true }
          ),
          fetchContact(query.email),
          verifyCode(query, { session }),
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
      origin,
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
