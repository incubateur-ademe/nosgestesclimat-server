import type supertest from 'supertest'

import { faker } from '@faker-js/faker'
import nock from 'nock'
import { baseURL } from '../../../../adapters/connect/client'
import {
  OrganisationTypeEnum,
  type OrganisationCreateDto,
} from '../../organisations.validator'

export const CREATE_ORGANISATION_ROUTE = '/organisations/v1'

export const UPDATE_ORGANISATION_ROUTE =
  '/organisations/v1/:organisationIdOrSlug'

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
