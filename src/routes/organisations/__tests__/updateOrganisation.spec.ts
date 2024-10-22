import { faker } from '@faker-js/faker'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import {
  ATTRIBUTE_IS_ORGANISATION_ADMIN,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  ATTRIBUTE_OPT_IN,
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_ORGANISATION_SLUG,
  ATTRIBUTE_PRENOM,
} from '../../../constants/brevo'
import { findUniqueOrgaSlug } from '../../../helpers/organisations/findUniqueOrgaSlug'
import {
  UPDATE_ORGANISATION_ROUTE,
  validateOrganisation,
} from './fixtures/organisations.fixture'

describe(`Given a validated NGC user organisation`, () => {
  const url = UPDATE_ORGANISATION_ROUTE
  const request = supertest(app)
  let validatedOrganisationFixture: Awaited<
    ReturnType<typeof validateOrganisation>
  >

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation()
    validatedOrganisationFixture = await validateOrganisation(request)
  })

  afterEach(async () => {
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
    ])
    jest.restoreAllMocks()
  })

  describe(`When the administator enters the last infos`, () => {
    let scope: nock.Scope

    beforeEach(async () => {
      const { email } = validatedOrganisationFixture
      const name = faker.company.name()
      const slug = await findUniqueOrgaSlug(name)
      const administratorName = faker.person.fullName()

      scope = nock(process.env.BREVO_URL!)
        .post('/v3/contacts', {
          email,
          attributes: {
            [ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
            [ATTRIBUTE_ORGANISATION_NAME]: name,
            [ATTRIBUTE_ORGANISATION_SLUG]: slug,
            [ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]: 0,
            [ATTRIBUTE_PRENOM]: administratorName,
            [ATTRIBUTE_OPT_IN]: false,
          },
          updateEnabled: true,
        })
        .reply(200)
        .post('/v3/smtp/email', {
          to: [
            {
              name: email,
              email,
            },
          ],
          templateId: 70,
          params: {
            ADMINISTRATOR_NAME: administratorName,
            ORGANISATION_NAME: name,
            DASHBOARD_URL: `https://nosgestesclimat.fr/organisations/${slug}?mtm_campaign=email-automatise&mtm_kwd=orga-admin-creation`,
          },
        })
        .reply(200)

      nock(process.env.CONNECT_URL!).post(`/api/v1/personnes`).reply(200)

      await request
        .post(url)
        .set({ cookie: `ngcjwt=${validatedOrganisationFixture.cookie}` })
        .send({
          email,
          name,
          administratorName,
          sendCreationEmail: true,
        })
    })

    it(`Then it sends a creation email to the administrator`, () => {
      expect(scope.isDone()).toBe(true)
    })
  })
})
