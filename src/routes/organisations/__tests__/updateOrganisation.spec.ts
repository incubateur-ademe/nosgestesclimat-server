import { faker } from '@faker-js/faker'
import nock from 'nock'
import supertest from 'supertest'
import { Attributes } from '../../../adapters/brevo/constant'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
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
            [Attributes.IS_ORGANISATION_ADMIN]: true,
            [Attributes.ORGANISATION_NAME]: name,
            [Attributes.ORGANISATION_SLUG]: slug,
            [Attributes.LAST_POLL_PARTICIPANTS_NUMBER]: 0,
            [Attributes.PRENOM]: administratorName,
            [Attributes.OPT_IN]: false,
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

  describe('When number of collaborators is a string', () => {
    beforeEach(async () => {
      jest.spyOn(prisma.organisation, 'upsert')

      const { email } = validatedOrganisationFixture
      const name = faker.company.name()
      const administratorName = faker.person.fullName()

      nock(process.env.BREVO_URL!)
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/smtp/email')
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
          numberOfCollaborators: '18',
        })
    })

    afterEach(() => jest.spyOn(prisma.organisation, 'upsert').mockRestore())

    it(`Then it stores a number`, async () => {
      // both mongoose and prismock coerce a number
      expect(prisma.organisation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            numberOfCollaborators: 18,
          }),
          update: expect.objectContaining({
            numberOfCollaborators: 18,
          }),
        })
      )
    })
  })
})
