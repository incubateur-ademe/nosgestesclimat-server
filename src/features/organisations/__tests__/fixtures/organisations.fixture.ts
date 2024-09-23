import type supertest from 'supertest'

import { faker } from '@faker-js/faker'
import nock from 'nock'
import slugify from 'slugify'
import { baseURL } from '../../../../adapters/connect/client'
import { prisma } from '../../../../adapters/prisma/client'
import type { OrganisationPollCreateDto } from '../../organisations.validator'
import {
  OrganisationTypeEnum,
  type OrganisationCreateDto,
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

  nock(process.env.BREVO_URL!)
    .post('/v3/smtp/email')
    .reply(200)
    .post('/v3/contacts')
    .reply(200)
  nock(baseURL).post('/api/v1/personnes').reply(200)

  const response = await agent
    .post(CREATE_ORGANISATION_ROUTE)
    .set('cookie', cookie)
    .send(payload)
    .expect(201)

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
      polls: {
        where: {
          slug: create.slug!,
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
      },
    },
  })
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
    .expect(500)

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
