import type { Request } from 'express'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import {
  isPrismaErrorNotFound,
  isPrismaErrorUniqueConstraintFailed,
} from '../../core/typeguards/isPrismaError'
import { login } from '../authentication/authentication.service'
import { OrganisationCreatedEvent } from './events/OrganisationCreated.event'
import { OrganisationUpdatedEvent } from './events/OrganisationUpdated.event'
import {
  createOrganisationAndAdministrator,
  createOrganisationPoll,
  deleteOrganisationPoll,
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
  organisation:
    | Awaited<
        ReturnType<typeof createOrganisationAndAdministrator>
      >['organisation']
    | Awaited<ReturnType<typeof fetchUserOrganisation>>,
  connectedUser: string
) => ({
  ...organisation,
  administrators: organisation.administrators.map(
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
      token = await login({
        ...user,
        code,
        email,
      })
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

const pollToDto = (
  poll: Awaited<ReturnType<typeof createOrganisationPoll>>['polls'][number]
) => ({
  ...poll,
  defaultAdditionalQuestions: poll.defaultAdditionalQuestions.map(
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
    } = await createOrganisationPoll(params, pollDto, user)

    return pollToDto(poll)
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

    return pollToDto(poll)
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
    return await deleteOrganisationPoll(params, user)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}
