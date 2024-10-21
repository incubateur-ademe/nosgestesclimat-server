import type supertest from 'supertest'

import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import slugify from 'slugify'
import { baseURL } from '../../../../adapters/connect/client'
import { prisma } from '../../../../adapters/prisma/client'
import { getSimulationPayload } from '../../../simulations/__tests__/fixtures/simulations.fixtures'
import type { SimulationCreateInputDto } from '../../../simulations/simulations.validator'
import {
  defaultPollSelection,
  organisationSelectionWithoutPolls,
} from '../../organisations.repository'
import type {
  OrganisationCreateDto,
  OrganisationPollCreateDto,
} from '../../organisations.validator'
import { OrganisationTypeEnum } from '../../organisations.validator'

export const CREATE_ORGANISATION_ROUTE = '/organisations/v1'

export const UPDATE_ORGANISATION_ROUTE =
  '/organisations/v1/:organisationIdOrSlug'

export const FETCH_ORGANISATIONS_ROUTE = '/organisations/v1'

export const FETCH_ORGANISATION_ROUTE =
  '/organisations/v1/:organisationIdOrSlug'

export const CREATE_ORGANISATION_POLL_ROUTE =
  '/organisations/v1/:organisationIdOrSlug/polls'

export const UPDATE_ORGANISATION_POLL_ROUTE =
  '/organisations/v1/:organisationIdOrSlug/polls/:pollIdOrSlug'

export const DELETE_ORGANISATION_POLL_ROUTE =
  '/organisations/v1/:organisationIdOrSlug/polls/:pollIdOrSlug'

export const FETCH_ORGANISATION_POLLS_ROUTE =
  '/organisations/v1/:organisationIdOrSlug/polls'

export const FETCH_ORGANISATION_POLL_ROUTE =
  '/organisations/v1/:organisationIdOrSlug/polls/:pollIdOrSlug'

export const CREATE_POLL_SIMULATION_ROUTE =
  '/organisations/v1/:organisationIdOrSlug/polls/:pollIdOrSlug/simulations'

type TestAgent = ReturnType<typeof supertest>

const organisationTypes = [
  OrganisationTypeEnum.association,
  OrganisationTypeEnum.company,
  OrganisationTypeEnum.cooperative,
  OrganisationTypeEnum.groupOfFriends,
  OrganisationTypeEnum.other,
  OrganisationTypeEnum.publicOrRegionalAuthority,
  OrganisationTypeEnum.universityOrSchool,
]

export const randomOrganisationType = () =>
  organisationTypes[Math.floor(Math.random() * organisationTypes.length)]

export const createOrganisation = async ({
  agent,
  cookie,
  organisation: { name, type, administrators, numberOfCollaborators } = {},
}: {
  agent: TestAgent
  cookie: string
  organisation?: Partial<OrganisationCreateDto>
}) => {
  const payload: OrganisationCreateDto = {
    name: name || faker.company.name(),
    type: type || randomOrganisationType(),
    administrators,
    numberOfCollaborators,
  }

  const scope = nock(process.env.BREVO_URL!)
    .post('/v3/smtp/email')
    .reply(200)
    .post('/v3/contacts')
    .reply(200)

  const [administrator] = administrators || []

  if (!administrator?.optedInForCommunications) {
    scope.post('/v3/contacts/lists/27/contacts/remove').reply(200)
  }

  nock(baseURL).post('/api/v1/personnes').reply(200)

  const response = await agent
    .post(CREATE_ORGANISATION_ROUTE)
    .set('cookie', cookie)
    .send(payload)
    .expect(StatusCodes.CREATED)

  nock.abortPendingRequests()

  return response.body
}

/**
 * Hack because prismock does not handle this correctly
 * The bug is that the created poll is not linked to the organisation
 * We create it and the we return the organisation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockUpdateOrganisationPollCreation: any = async (params: any) => {
  if (!params.data.polls?.create || !params.where.id) {
    throw new Error('Invalid call')
  }

  const {
    where: { id },
    data: {
      polls: { create },
    },
  } = params

  await prisma.poll.create({
    data: {
      ...create,
      organisationId: id,
    },
  })

  return prisma.organisation.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      ...organisationSelectionWithoutPolls,
      polls: {
        where: {
          slug: create.slug!,
        },
        select: defaultPollSelection,
      },
    },
  })
}

/**
 * Hack because prismock does not handle this correctly
 * The bug is that we sort by nested simulation createdAt => no effect
 */
type FindManySimulationPolls = typeof prisma.simulationPoll.findMany

export const mockSimulationPollsFindManyOrderBySimulationCreatedAt =
  (originalFindMany: FindManySimulationPolls) =>
  (params: Parameters<FindManySimulationPolls>[0]) =>
    originalFindMany({
      ...params,
      skip: 0,
      select: {
        id: true,
        simulation: {
          select: {
            createdAt: true,
          },
        },
      },
    }).then((result) => {
      if (
        params?.orderBy &&
        !Array.isArray(params.orderBy) &&
        params.orderBy.simulation?.createdAt
      ) {
        const sort = params.orderBy.simulation.createdAt

        result.sort((a, b) => {
          return sort === 'desc'
            ? a.simulation.createdAt > b.simulation.createdAt
              ? -1
              : 1
            : a.simulation.createdAt > b.simulation.createdAt
              ? 1
              : -1
        })
      }

      return result.slice(params?.skip || 0).map(({ id }) => ({
        id,
      }))
    }) as ReturnType<FindManySimulationPolls>

export const createOrganisationPoll = async ({
  agent,
  cookie,
  organisationId,
  poll: {
    name,
    customAdditionalQuestions,
    defaultAdditionalQuestions,
    expectedNumberOfParticipants,
  } = {},
}: {
  agent: TestAgent
  cookie: string
  organisationId: string
  poll?: Partial<OrganisationPollCreateDto>
}) => {
  const payload: OrganisationPollCreateDto = {
    name: name || faker.company.buzzNoun(),
    customAdditionalQuestions,
    defaultAdditionalQuestions,
    expectedNumberOfParticipants,
  }

  /**
   * Hack because prismock does not handle this correctly
   * The bug is that the created poll is not linked to the organisation
   * We create it and the we update it
   */
  await agent
    .post(
      CREATE_ORGANISATION_POLL_ROUTE.replace(
        ':organisationIdOrSlug',
        organisationId
      )
    )
    .set('cookie', cookie)
    .send(payload)
    .expect(StatusCodes.INTERNAL_SERVER_ERROR)

  const poll = await prisma.poll.update({
    where: {
      slug: slugify(payload.name.toLowerCase(), { strict: true }),
    },
    data: {
      organisationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      defaultAdditionalQuestions: true,
      customAdditionalQuestions: true,
      expectedNumberOfParticipants: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    ...poll,
    createdAt: poll.createdAt.toISOString(),
    defaultAdditionalQuestions: poll.defaultAdditionalQuestions.map(
      ({ type }) => type
    ),
  }
}

export const createOrganisationPollSimulation = async ({
  agent,
  organisationId,
  pollId,
  simulation = {},
}: {
  agent: TestAgent
  organisationId: string
  pollId: string
  simulation?: Partial<SimulationCreateInputDto>
}) => {
  const { user } = simulation
  const payload: SimulationCreateInputDto = {
    ...getSimulationPayload(simulation),
    user: {
      ...user,
      id: user?.id || faker.string.uuid(),
    },
  }

  const scope = nock(process.env.BREVO_URL!)
    .post('/v3/contacts')
    .reply(200)
    .post('/v3/contacts/lists/27/contacts/remove')
    .reply(200)

  if (payload.user.email) {
    scope
      .post('/v3/smtp/email')
      .reply(200)
      .post('/v3/contacts')
      .reply(200)
      .post('/v3/contacts/lists/35/contacts/remove')
      .reply(200)
  }

  const response = await agent
    .post(
      CREATE_POLL_SIMULATION_ROUTE.replace(
        ':organisationIdOrSlug',
        organisationId
      ).replace(':pollIdOrSlug', pollId)
    )
    .send(payload)
    .expect(StatusCodes.CREATED)

  return response.body
}
