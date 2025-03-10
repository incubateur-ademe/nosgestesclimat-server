import type supertest from 'supertest'

import { faker } from '@faker-js/faker'
import { OrganisationType } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import { baseURL } from '../../../../adapters/connect/client'
import { prisma } from '../../../../adapters/prisma/client'
import { getSimulationPayload } from '../../../simulations/__tests__/fixtures/simulations.fixtures'
import type { SimulationCreateInputDto } from '../../../simulations/simulations.validator'
import type {
  OrganisationCreateDto,
  OrganisationPollCreateDto,
} from '../../organisations.validator'

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

export const FETCH_ORGANISATION_PUBLIC_POLL_ROUTE =
  '/organisations/v1/:userId/public-polls/:pollIdOrSlug'

export const CREATE_ORGANISATION_PUBLIC_POLL_SIMULATION_ROUTE =
  '/organisations/v1/:userId/public-polls/:pollIdOrSlug/simulations'

export const FETCH_ORGANISATION_PUBLIC_POLL_SIMULATIONS_ROUTE =
  '/organisations/v1/:userId/public-polls/:pollIdOrSlug/simulations'

export const FETCH_ORGANISATION_PUBLIC_POLL_DASHBOARD_ROUTE =
  '/organisations/v1/:userId/public-polls/:pollIdOrSlug/dashboard'

type TestAgent = ReturnType<typeof supertest>

const organisationTypes = Object.values(OrganisationType)

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
    scope
      .post('/v3/contacts/lists/27/contacts/remove')
      .reply(400, { code: 'invalid_parameter' })
  }

  nock(baseURL).post('/api/v1/personnes').reply(200)

  const response = await agent
    .post(CREATE_ORGANISATION_ROUTE)
    .set('cookie', cookie)
    .send(payload)
    .expect(StatusCodes.CREATED)

  expect(nock.isDone()).toBeTruthy()

  return response.body
}

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

  const scope = nock(process.env.BREVO_URL!).post('/v3/contacts').reply(200)

  const {
    administrators: [administrator],
  } = await prisma.organisation.findUniqueOrThrow({
    where: {
      id: organisationId,
    },
    select: {
      administrators: {
        select: {
          user: {
            select: {
              optedInForCommunications: true,
            },
          },
        },
      },
    },
  })

  if (!administrator.user.optedInForCommunications) {
    scope
      .post('/v3/contacts/lists/27/contacts/remove')
      .reply(400, { code: 'invalid_parameter' })
  }

  const response = await agent
    .post(
      CREATE_ORGANISATION_POLL_ROUTE.replace(
        ':organisationIdOrSlug',
        organisationId
      )
    )
    .set('cookie', cookie)
    .send(payload)
    .expect(StatusCodes.CREATED)

  expect(nock.isDone()).toBeTruthy()

  return response.body
}

export const createOrganisationPollSimulation = async ({
  agent,
  userId,
  pollId,
  simulation = {},
}: {
  agent: TestAgent
  userId?: string
  pollId: string
  simulation?: Partial<SimulationCreateInputDto>
}) => {
  userId = userId ?? faker.string.uuid()
  const { user } = simulation
  const payload: SimulationCreateInputDto = {
    ...getSimulationPayload(simulation),
    user,
  }

  const scope = nock(process.env.BREVO_URL!)
    .post('/v3/contacts')
    .reply(200)
    .post('/v3/contacts/lists/27/contacts/remove')
    .reply(400, { code: 'invalid_parameter' })

  if (payload.user?.email) {
    const existingParticipation = await prisma.simulationPoll.findFirst({
      where: {
        pollId,
        simulation: {
          user: {
            email: payload.user.email,
          },
        },
      },
      select: { id: true },
    })

    if (!existingParticipation) {
      scope.post('/v3/smtp/email').reply(200)
    }

    scope
      .post('/v3/contacts')
      .reply(200)
      .post('/v3/contacts/lists/35/contacts/remove')
      .reply(400, { code: 'invalid_parameter' })
  }

  const response = await agent
    .post(
      CREATE_ORGANISATION_PUBLIC_POLL_SIMULATION_ROUTE.replace(
        ':userId',
        userId
      ).replace(':pollIdOrSlug', pollId)
    )
    .send(payload)
    .expect(StatusCodes.CREATED)

  expect(nock.isDone()).toBeTruthy()

  return response.body
}
