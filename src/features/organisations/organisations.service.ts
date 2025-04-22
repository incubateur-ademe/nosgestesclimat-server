import type { Organisation, Poll } from '@prisma/client'
import type { Request } from 'express'
import { prisma } from '../../adapters/prisma/client'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import { config } from '../../config'
import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import {
  isPrismaErrorNotFound,
  isPrismaErrorUniqueConstraintFailed,
} from '../../core/typeguards/isPrismaError'
import { exchangeCredentialsForToken } from '../authentication/authentication.service'
import { getPollFunFacts } from '../simulations/simulations.service'
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
  fetchOrganisationPublicPoll,
  fetchUserOrganisation,
  fetchUserOrganisations,
  findSimulationPoll,
  setPollFunFacts,
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
  PublicPollParams,
} from './organisations.validator'

const organisationToDto = (
  organisation: Organisation &
    Partial<Awaited<ReturnType<typeof fetchUserOrganisation>>>,
  connectedUserEmail: string
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
        email: userEmail,
        createdAt,
        optedInForCommunications,
        position,
        telephone,
        updatedAt,
      },
    }) => ({
      ...(userEmail === connectedUserEmail
        ? {
            id,
            userId,
            name,
            email: userEmail,
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
    const { organisation, administrator } = await transaction((session) =>
      createOrganisationAndAdministrator(organisationDto, user, { session })
    )

    const organisationCreatedEvent = new OrganisationCreatedEvent({
      administrator,
      organisation,
      origin,
    })

    EventBus.emit(organisationCreatedEvent)

    await EventBus.once(organisationCreatedEvent)

    return organisationToDto(organisation, user.email)
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
    const { organisation, administrator } = await transaction((session) =>
      updateAdministratorOrganisation(params, organisationDto, user, {
        session,
      })
    )

    const organisationUpdatedEvent = new OrganisationUpdatedEvent({
      administrator,
      organisation,
    })

    EventBus.emit(organisationUpdatedEvent)

    await EventBus.once(organisationUpdatedEvent)

    return {
      token,
      organisation: organisationToDto(organisation, user.email),
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
  const organisations = await transaction(
    (session) => fetchUserOrganisations(user, { session }),
    prisma
  )

  return organisations.map((organisation) =>
    organisationToDto(organisation, user.email)
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
    const organisation = await transaction(
      (session) => fetchUserOrganisation(params, user, { session }),
      prisma
    )

    return organisationToDto(organisation, user.email)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Organisation not found')
    }
    throw e
  }
}

type PublicPoll = Poll &
  Partial<Awaited<ReturnType<typeof fetchOrganisationPoll>>>

const isOrganisationAdmin = (
  organisation: NonNullable<PublicPoll['organisation']>,
  connectedUser?: NonNullable<Request['user']> | string
): connectedUser is NonNullable<Request['user']> =>
  typeof connectedUser === 'object' &&
  organisation.administrators.some(
    ({ user }) => user.email === connectedUser.email
  )

const pollToDto = ({
  poll: { organisationId: _, organisation, simulations, ...poll },
  user,
}: {
  poll: PublicPoll
  user?: NonNullable<Request['user']> | string
}) => ({
  ...poll,
  ...(organisation
    ? {
        organisation: isOrganisationAdmin(organisation, user)
          ? organisationToDto(organisation, user.email)
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
  simulations: {
    count: simulations?.length || 0,
    finished:
      simulations?.filter(
        ({ simulation: { progression } }) => progression === 1
      ).length || 0,
    hasParticipated: !!simulations?.find(
      ({
        simulation: {
          user: { id },
        },
      }) => (typeof user === 'object' ? user.userId === id : user === id)
    ),
  },
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
    } = await transaction((session) =>
      createOrganisationPoll(params, pollDto, user, { session })
    )

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
    const poll = await transaction((session) =>
      updateOrganisationPoll(params, pollDto, user, { session })
    )
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
    const { organisation } = await transaction((session) =>
      deleteOrganisationPoll(params, user, { session })
    )

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
    const { polls } = await transaction((session) =>
      fetchOrganisationPolls(params, user, { session })
    )

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
    const poll = await transaction((session) =>
      fetchOrganisationPoll(params, user, { session })
    )

    return pollToDto({ poll, user })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

export const fetchPublicPoll = async ({
  params,
  user,
}: {
  params: PublicPollParams
  user?: NonNullable<Request['user']>
}) => {
  try {
    const poll = await transaction((session) =>
      fetchOrganisationPublicPoll(params, { session })
    )

    return pollToDto({
      poll,
      user: user || params.userId,
    })
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}

export const updatePollFunFacts = async (
  pollId: string,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (session) => {
    const funFacts = await getPollFunFacts({ id: pollId }, { session })

    await setPollFunFacts(pollId, funFacts, { session })
  }, session)
}

export const updatePollFunFactsAfterSimulationChange = (
  simulationId: string
) => {
  return transaction(async (session) => {
    const simulationPoll = await findSimulationPoll(
      { simulationId },
      { session }
    )

    if (!simulationPoll) {
      return
    }

    const { pollId } = simulationPoll

    return updatePollFunFacts(pollId, { session })
  })
}
