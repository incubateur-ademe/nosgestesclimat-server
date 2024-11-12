import type { Organisation, Poll } from '@prisma/client'
import type { Request } from 'express'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import {
  isPrismaErrorNotFound,
  isPrismaErrorUniqueConstraintFailed,
} from '../../core/typeguards/isPrismaError'
import { exchangeCredentialsForToken } from '../authentication/authentication.service'
import { OrganisationCreatedEvent } from './events/OrganisationCreated.event'
import { OrganisationUpdatedEvent } from './events/OrganisationUpdated.event'
import { PollCreatedEvent as PollUpdatedEvent } from './events/PollCreated.event'
import { PollDeletedEvent } from './events/PollDeletedEvent'
import {
  createOrganisationAndAdministrator,
  createOrganisationPoll,
  deleteOrganisationPoll,
  fetchOrganisationPoll,
  fetchOrganisationPolls,
  fetchUserOrganisation,
  fetchUserOrganisations,
  updateAdministratorOrganisation,
  updateOrganisationPoll,
} from './organisations.repository'
import type {
  OrganisationCreateDto,
  OrganisationParams,
  OrganisationPollCreateDto,
  OrganisationPollParams,
  OrganisationPollUpdateDto,
  OrganisationUpdateDto,
} from './organisations.validator'

const organisationToDto = (
  organisation: Organisation &
    Partial<Awaited<ReturnType<typeof fetchUserOrganisation>>>,
  connectedUser: string
) => ({
  ...organisation,
  hasCustomQuestionEnabled:
    config.organisationIdsWithCustomQuestionsEnabled.has(organisation.id),
  administrators: organisation.administrators?.map(
    ({
      id,
      user: {
        id: userId,
        name,
        email,
        createdAt,
        optedInForCommunications,
        position,
        telephone,
        updatedAt,
      },
    }) => ({
      ...(userId === connectedUser
        ? {
            id,
            userId,
            name,
            email,
            position,
            telephone,
            optedInForCommunications,
            createdAt,
            updatedAt,
          }
        : {
            id,
            name,
            position,
            createdAt,
            updatedAt,
          }),
    })
  ),
})

export const createOrganisation = async ({
  organisationDto,
  origin,
  user,
}: {
  organisationDto: OrganisationCreateDto
  origin: string
  user: NonNullable<Request['user']>
}) => {
  try {
    const { organisation, administrator } =
      await createOrganisationAndAdministrator(organisationDto, user)

    const organisationCreatedEvent = new OrganisationCreatedEvent({
      administrator,
      organisation,
      origin,
    })

    EventBus.emit(organisationCreatedEvent)

    await EventBus.once(organisationCreatedEvent)

    return organisationToDto(organisation, user.userId)
  } catch (e) {
    if (isPrismaErrorUniqueConstraintFailed(e)) {
      throw new ForbiddenException(
        "Forbidden ! An organisation with this administrator's email already exists."
      )
    }
    throw e
  }
}

export const updateOrganisation = async ({
  params,
  organisationDto,
  code,
  user,
}: {
  params: OrganisationParams
  organisationDto: OrganisationUpdateDto
  code?: string
  user: NonNullable<Request['user']>
}) => {
  let token: string | undefined
  const { administrators: [{ email }] = [{}] } = organisationDto
  if (email && email !== user.email) {
    if (!code) {
      throw new ForbiddenException(
        'Forbidden ! Cannot update administrator email without a verification code.'
      )
    }

    try {
      ;({ token } = await exchangeCredentialsForToken({
        ...user,
        code,
        email,
      }))
    } catch (e) {
      if (e instanceof EntityNotFoundException) {
        throw new ForbiddenException('Forbidden ! Invalid verification code.')
      }
      throw e
    }
  }

  try {
    const { organisation, administrator } =
      await updateAdministratorOrganisation(params, organisationDto, user)

    const organisationUpdatedEvent = new OrganisationUpdatedEvent({
      administrator,
      organisation,
    })

    EventBus.emit(organisationUpdatedEvent)

    await EventBus.once(organisationUpdatedEvent)

    return {
      token,
      organisation: organisationToDto(organisation, user.userId),
    }
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Organisation not found')
    }
    if (isPrismaErrorUniqueConstraintFailed(e)) {
      throw new ForbiddenException(
        'Forbidden ! This email already belongs to another organisation.'
      )
    }
    throw e
  }
}

export const fetchOrganisations = async (
  user: NonNullable<Request['user']>
) => {
  const organisations = await fetchUserOrganisations(user)

  return organisations.map((organisation) =>
    organisationToDto(organisation, user.userId)
  )
}

export const fetchOrganisation = async ({
  params,
  user,
}: {
  params: OrganisationParams
  user: NonNullable<Request['user']>
}) => {
  try {
    const organisation = await fetchUserOrganisation(params, user)

    return organisationToDto(organisation, user.userId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Organisation not found')
    }
    throw e
  }
}

const pollToDto = ({
  poll: { organisationId: _, organisation, ...poll },
  user,
}: {
  poll: Poll & Partial<Awaited<ReturnType<typeof fetchOrganisationPoll>>>
  user?: NonNullable<Request['user']>
}) => ({
  ...poll,
  ...(organisation
    ? {
        organisation: user
          ? organisationToDto(organisation, user.userId)
          : {
              id: organisation.id,
              name: organisation.name,
              slug: organisation.slug,
            },
      }
    : {}),
  defaultAdditionalQuestions: poll.defaultAdditionalQuestions?.map(
    ({ type }) => type
  ),
})

export const createPoll = async ({
  params,
  pollDto,
  user,
}: {
  params: OrganisationParams
  pollDto: OrganisationPollCreateDto
  user: NonNullable<Request['user']>
}) => {
  try {
    const {
      polls: [poll],
      ...organisation
    } = await createOrganisationPoll(params, pollDto, user)

    const pollCreatedEvent = new PollUpdatedEvent({ poll, organisation })

    EventBus.emit(pollCreatedEvent)

    await EventBus.once(pollCreatedEvent)

    return pollToDto({ poll, user })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Organisation not found')
    }
    throw e
  }
}

export const updatePoll = async ({
  params,
  pollDto,
  user,
}: {
  params: OrganisationPollParams
  pollDto: OrganisationPollUpdateDto
  user: NonNullable<Request['user']>
}) => {
  try {
    const poll = await updateOrganisationPoll(params, pollDto, user)
    const { organisation } = poll

    const pollUpdatedEvent = new PollUpdatedEvent({ poll, organisation })

    EventBus.emit(pollUpdatedEvent)

    await EventBus.once(pollUpdatedEvent)

    return pollToDto({ poll, user })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

export const deletePoll = async ({
  params,
  user,
}: {
  params: OrganisationPollParams
  user: NonNullable<Request['user']>
}) => {
  try {
    const { organisation } = await deleteOrganisationPoll(params, user)

    const pollDeletedEvent = new PollDeletedEvent({ organisation })

    EventBus.emit(pollDeletedEvent)

    await EventBus.once(pollDeletedEvent)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

export const fetchPolls = async ({
  params,
  user,
}: {
  params: OrganisationParams
  user: NonNullable<Request['user']>
}) => {
  try {
    const { polls } = await fetchOrganisationPolls(params, user)

    return polls.map((poll) => pollToDto({ poll, user }))
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Organisation not found')
    }
    throw e
  }
}

export const fetchPoll = async ({
  params,
  user,
}: {
  params: OrganisationPollParams
  user: NonNullable<Request['user']>
}) => {
  try {
    const poll = await fetchOrganisationPoll(params, user)

    return pollToDto({ poll, user })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}
