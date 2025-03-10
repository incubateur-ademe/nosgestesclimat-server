import { faker } from '@faker-js/faker'
import { OrganisationType } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import slugify from 'slugify'
import supertest from 'supertest'
import { baseURL } from '../../../adapters/connect/client'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import { COOKIE_NAME } from '../../authentication/authentication.service'
import type { OrganisationCreateDto } from '../organisations.validator'
import {
  CREATE_ORGANISATION_ROUTE,
  createOrganisation,
  randomOrganisationType,
} from './fixtures/organisations.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_ORGANISATION_ROUTE

  afterEach(async () => {
    await prisma.organisationAdministrator.deleteMany()
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And logged out', () => {
    describe('When creating his organisation', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent.post(url).expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And invalid cookie', () => {
    describe('When creating his organisation', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .post(url)
          .set('cookie', `${COOKIE_NAME}=invalid cookie`)
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And logged in', () => {
    let cookie: string
    let userId: string
    let email: string

    beforeEach(async () => {
      ;({ cookie, email, userId } = await login({ agent }))
    })

    describe('When creating his organisation', () => {
      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('cookie', cookie)
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid name', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('cookie', cookie)
            .send({
              name: '',
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.BAD_REQUEST)

          await agent
            .post(url)
            .set('cookie', cookie)
            .send({
              name: faker.string.alpha(101),
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid type', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: 'my-invalid-organisationType',
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      test(`Then it returns a ${StatusCodes.CREATED} response with the created organisation`, async () => {
        const payload = {
          name: faker.company.name(),
        }

        nock(process.env.BREVO_URL!)
          .post('/v3/smtp/email')
          .reply(200)
          .post('/v3/contacts')
          .reply(200)
          .post('/v3/contacts/lists/27/contacts/remove')
          .reply(200)
        nock(baseURL).post('/api/v1/personnes').reply(200)

        const response = await agent
          .post(url)
          .set('cookie', cookie)
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(response.body).toEqual({
          ...payload,
          type: OrganisationType.other,
          id: expect.any(String),
          slug: slugify(payload.name.toLowerCase(), { strict: true }),
          hasCustomQuestionEnabled: false,
          numberOfCollaborators: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          polls: [],
          administrators: [
            {
              id: expect.any(String),
              userId,
              email,
              name: null,
              position: null,
              telephone: null,
              optedInForCommunications: false,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
          ],
        })
      })

      test('Then it stores an organisation in database', async () => {
        const administratorPayload = {
          name: faker.person.fullName(),
          optedInForCommunications: true,
          position: faker.person.jobDescriptor(),
          telephone: faker.phone.number(),
        }
        const payload: OrganisationCreateDto = {
          name: faker.company.name(),
          type: randomOrganisationType(),
          numberOfCollaborators: faker.number.int({ max: 100 }),
          administrators: [administratorPayload],
        }

        nock(process.env.BREVO_URL!)
          .post('/v3/smtp/email')
          .reply(200)
          .post('/v3/contacts')
          .reply(200)
        nock(baseURL).post('/api/v1/personnes').reply(200)

        const {
          body: { id },
        } = await agent
          .post(url)
          .set('cookie', cookie)
          .send(payload)
          .expect(StatusCodes.CREATED)

        const createdOrganisation = await prisma.organisation.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            numberOfCollaborators: true,
            administrators: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    position: true,
                    telephone: true,
                    optedInForCommunications: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
            polls: true,
            createdAt: true,
            updatedAt: true,
          },
        })
        expect(createdOrganisation).toEqual({
          ...payload,
          id,
          slug: slugify(payload.name.toLowerCase(), { strict: true }),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          polls: [],
          administrators: [
            {
              id: expect.any(String),
              user: {
                ...administratorPayload,
                id: userId,
                email,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
              },
            },
          ],
        })
      })

      test('Then it adds or updates the contact in connect', async () => {
        const administratorPayload = {
          optedInForCommunications: true,
          name: faker.person.fullName(),
          position: 'Manager',
        }
        const payload: OrganisationCreateDto = {
          name: faker.company.name(),
          type: randomOrganisationType(),
          administrators: [administratorPayload],
        }

        nock(process.env.BREVO_URL!)
          .post('/v3/smtp/email')
          .reply(200)
          .post('/v3/contacts')
          .reply(200)
        const scope = nock(baseURL, {
          reqheaders: {
            client_id: process.env.CONNECT_CLIENT_ID!,
            client_secret: process.env.CONNECT_CLIENT_SECRET!,
          },
        })
          .post('/api/v1/personnes', {
            email,
            nom: administratorPayload.name,
            fonction: administratorPayload.position,
            source: 'Nos gestes Climat',
          })
          .reply(200)

        await agent
          .post(url)
          .set('cookie', cookie)
          .send(payload)
          .expect(StatusCodes.CREATED)

        await EventBus.flush()

        expect(scope.isDone()).toBeTruthy()
      })

      test('Then it sends a creation email', async () => {
        const administratorPayload = {
          optedInForCommunications: true,
          name: faker.person.fullName(),
        }
        const payload = {
          name: faker.company.name(),
          type: randomOrganisationType(),
          administrators: [administratorPayload],
        }

        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .post('/v3/smtp/email', {
            to: [
              {
                name: email,
                email,
              },
            ],
            templateId: 70,
            params: {
              ADMINISTRATOR_NAME: administratorPayload.name,
              ORGANISATION_NAME: payload.name,
              DASHBOARD_URL: `https://nosgestesclimat.fr/organisations/${slugify(payload.name.toLowerCase(), { strict: true })}?mtm_campaign=email-automatise&mtm_kwd=orga-admin-creation`,
            },
          })
          .reply(200)
          .post('/v3/contacts')
          .reply(200)
        nock(baseURL).post('/api/v1/personnes').reply(200)

        await agent
          .post(url)
          .set('cookie', cookie)
          .send(payload)
          .expect(StatusCodes.CREATED)

        await EventBus.flush()

        expect(scope.isDone()).toBeTruthy()
      })

      describe('And opt in for communications', () => {
        test('Then it adds or updates organisation administrator in brevo', async () => {
          const administratorPayload = {
            optedInForCommunications: true,
            name: faker.person.fullName(),
            position: 'Manager',
          }
          const payload: OrganisationCreateDto = {
            name: faker.company.name(),
            type: randomOrganisationType(),
            administrators: [administratorPayload],
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/smtp/email')
            .reply(200)
            .post('/v3/contacts', {
              email,
              listIds: [27],
              attributes: {
                USER_ID: userId,
                IS_ORGANISATION_ADMIN: true,
                ORGANISATION_NAME: payload.name,
                ORGANISATION_SLUG: slugify(payload.name.toLowerCase(), {
                  strict: true,
                }),
                LAST_POLL_PARTICIPANTS_NUMBER: 0,
                OPT_IN: true,
                PRENOM: administratorPayload.name,
              },
              updateEnabled: true,
            })
            .reply(200)
          nock(baseURL).post('/api/v1/personnes').reply(200)

          await agent
            .post(url)
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And opt out for communications', () => {
        test('Then it adds or updates organisation administrator in brevo', async () => {
          const administratorPayload = {
            optedInForCommunications: false,
            name: faker.person.fullName(),
            position: 'Manager',
          }
          const payload: OrganisationCreateDto = {
            name: faker.company.name(),
            type: randomOrganisationType(),
            administrators: [administratorPayload],
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/smtp/email')
            .reply(200)
            .post('/v3/contacts', {
              email,
              attributes: {
                USER_ID: userId,
                IS_ORGANISATION_ADMIN: true,
                ORGANISATION_NAME: payload.name,
                ORGANISATION_SLUG: slugify(payload.name.toLowerCase(), {
                  strict: true,
                }),
                LAST_POLL_PARTICIPANTS_NUMBER: 0,
                OPT_IN: false,
                PRENOM: administratorPayload.name,
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/contacts/lists/27/contacts/remove', {
              emails: [email],
            })
            .reply(200)
          nock(baseURL).post('/api/v1/personnes').reply(200)

          await agent
            .post(url)
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And custom user origin (preprod)', () => {
        test('Then it sends a creation email', async () => {
          const administratorPayload = {
            optedInForCommunications: true,
            name: faker.person.fullName(),
          }
          const payload: OrganisationCreateDto = {
            name: faker.company.name(),
            type: randomOrganisationType(),
            administrators: [administratorPayload],
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/smtp/email', {
              to: [
                {
                  name: email,
                  email,
                },
              ],
              templateId: 70,
              params: {
                ADMINISTRATOR_NAME: administratorPayload.name,
                ORGANISATION_NAME: payload.name,
                DASHBOARD_URL: `https://preprod.nosgestesclimat.preprod.fr/organisations/${slugify(payload.name.toLowerCase(), { strict: true })}?mtm_campaign=email-automatise&mtm_kwd=orga-admin-creation`,
              },
            })
            .reply(200)
            .post('/v3/contacts')
            .reply(200)
          nock(baseURL).post('/api/v1/personnes').reply(200)

          await agent
            .post(url)
            .set('cookie', cookie)
            .set('origin', 'https://preprod.nosgestesclimat.preprod.fr')
            .send(payload)
            .expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And an organisation already does exist for the user', () => {
        beforeEach(() => createOrganisation({ agent, cookie }))

        test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
          const response = await agent
            .post(url)
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.FORBIDDEN)

          expect(response.text).toEqual(
            "Forbidden ! An organisation with this administrator's email already exists."
          )

          jest.spyOn(prisma.organisation, 'create').mockRestore()
        })
      })

      describe('And an organisation already does exists with the same name', () => {
        let name: string

        beforeEach(async () => {
          name = faker.company.name()
          const { cookie } = await login({
            agent,
          })
          await createOrganisation({ agent, cookie, organisation: { name } })
        })

        test(`Then it returns a ${StatusCodes.CREATED} response with the created organisation and an incremented slug`, async () => {
          const payload: OrganisationCreateDto = {
            name,
            type: randomOrganisationType(),
            administrators: [
              {
                optedInForCommunications: true,
              },
            ],
          }

          nock(process.env.BREVO_URL!)
            .post('/v3/smtp/email')
            .reply(200)
            .post('/v3/contacts')
            .reply(200)
          nock(baseURL).post('/api/v1/personnes').reply(200)

          const response = await agent
            .post(url)
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(response.body).toEqual({
            ...payload,
            id: expect.any(String),
            slug: `${slugify(payload.name.toLowerCase(), { strict: true })}-1`,
            numberOfCollaborators: null,
            hasCustomQuestionEnabled: false,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            polls: [],
            administrators: [
              {
                id: expect.any(String),
                userId,
                email,
                name: null,
                position: null,
                telephone: null,
                optedInForCommunications: true,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              },
            ],
          })
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          jest
            .spyOn(prisma, '$transaction')
            .mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          jest.spyOn(prisma, '$transaction').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .post(url)
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent.post(url).set('cookie', cookie).send({
            name: faker.company.name(),
            type: randomOrganisationType(),
          })

          expect(logger.error).toHaveBeenCalledWith(
            'Organisation creation failed',
            databaseError
          )
        })
      })
    })
  })
})
