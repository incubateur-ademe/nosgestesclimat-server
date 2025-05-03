import type { Organisation } from '@prisma/client'
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
import type { SimulationAsyncEvent } from '../simulations/events/SimulationUpserted.event'
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

type PollData = Awaited<ReturnType<typeof fetchOrganisationPoll>>
type PollSimulationsInfos = PollData['simulationsInfos']
type PollOrganisation = PollData['organisation']
type PollPopulated = PollData['poll']

const isOrganisationAdmin = (
  organisation: PollOrganisation,
  connectedUser?: NonNullable<Request['user']> | string
): connectedUser is NonNullable<Request['user']> =>
  typeof connectedUser === 'object' &&
  organisation.administrators.some(
    ({ user }) => user.email === connectedUser.email
  )

const pollToDto = ({
  poll: { organisationId: _1, computeRealTimeStats: _2, ...poll },
  simulationsInfos: simulations,
  organisation,
  user,
}: {
  poll: PollPopulated
  simulationsInfos: PollSimulationsInfos
  organisation: PollOrganisation
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
  simulations,
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
    const { poll, organisation, simulationsInfos } = await transaction(
      (session) => createOrganisationPoll(params, pollDto, user, { session })
    )

    const pollCreatedEvent = new PollUpdatedEvent({ poll, organisation })

    EventBus.emit(pollCreatedEvent)

    await EventBus.once(pollCreatedEvent)

    return pollToDto({ poll, organisation, simulationsInfos, user })
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
    const { poll, organisation, simulationsInfos } = await transaction(
      (session) => updateOrganisationPoll(params, pollDto, user, { session })
    )

    const pollUpdatedEvent = new PollUpdatedEvent({ poll, organisation })

    EventBus.emit(pollUpdatedEvent)

    await EventBus.once(pollUpdatedEvent)

    return pollToDto({ poll, organisation, simulationsInfos, user })
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
    const { organisation, polls } = await transaction(
      (session) => fetchOrganisationPolls(params, user, { session }),
      prisma
    )

    return polls.map(({ poll, simulationsInfos }) =>
      pollToDto({ poll, user, simulationsInfos, organisation })
    )
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
    const { poll, organisation, simulationsInfos } = await transaction(
      (session) => fetchOrganisationPoll(params, user, { session }),
      prisma
    )

    return pollToDto({ poll, organisation, simulationsInfos, user })
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
    const { poll, organisation, simulationsInfos } = await transaction(
      (session) =>
        fetchOrganisationPublicPoll(
          {
            ...params,
            user,
          },
          { session }
        ),
      prisma
    )

    return pollToDto({
      poll,
      organisation,
      simulationsInfos,
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
  { pollId, simulation }: { pollId: string; simulation?: SimulationAsyncEvent },
  { session }: { session?: Session } = {}
) => {
  return transaction(async (session) => {
    const funFacts = await getPollFunFacts(
      { id: pollId, simulation },
      { session }
    )

    await setPollFunFacts(pollId, funFacts, { session })
  }, session)
}

export const updatePollFunFactsAfterSimulationChange = ({
  simulation,
  created,
}: {
  simulation: SimulationAsyncEvent
  created: boolean
}) => {
  return transaction(async (session) => {
    const simulationPoll = await findSimulationPoll(
      { simulationId: simulation.id },
      { session }
    )

    if (!simulationPoll || !simulationPoll.poll.computeRealTimeStats) {
      return
    }

    const { pollId } = simulationPoll

    return updatePollFunFacts(
      { pollId, ...(created ? { simulation } : {}) },
      { session }
    )
  }, prisma)
}
