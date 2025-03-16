import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import nock from 'nock'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { baseURL } from '../../../adapters/connect/client'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import { createVerificationCode } from '../../authentication/__tests__/fixtures/verification-codes.fixture'
import { COOKIE_NAME } from '../../authentication/authentication.service'
import type { OrganisationUpdateDto } from '../organisations.validator'
import {
  createOrganisation,
  randomOrganisationType,
  UPDATE_ORGANISATION_ROUTE,
} from './fixtures/organisations.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = UPDATE_ORGANISATION_ROUTE

  afterEach(async () => {
    await prisma.organisationAdministrator.deleteMany()
    await Promise.all([
      prisma.organisation.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And logged out', () => {
    describe('When updating his organisation', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .put(
            url.replace(
              ':organisationIdOrSlug',
              faker.database.mongodbObjectId()
            )
          )
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })

  describe('And invalid cookie', () => {
    describe('When updating his organisation', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .put(
            url.replace(
              ':organisationIdOrSlug',
              faker.database.mongodbObjectId()
            )
          )
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
      ;({ cookie, userId, email } = await login({ agent }))
    })

    describe('When updating his organisation', () => {
      describe('And invalid name', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: '',
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.BAD_REQUEST)

          await agent
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
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
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: 'my-invalid-organisationType',
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid administrator email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: randomOrganisationType(),
              administrators: [
                {
                  email: 'Je ne donne jamais mon email',
                },
              ],
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And organisation does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And organisation does exist', () => {
        let organisation: Awaited<ReturnType<typeof createOrganisation>>
        let organisationId: string
        let organisationSlug: string

        beforeEach(async () => {
          organisation = await createOrganisation({ agent, cookie })
          ;({ id: organisationId, slug: organisationSlug } = organisation)
        })

        test(`Then it returns a ${StatusCodes.OK} response with the updated organisation`, async () => {
          const payload: OrganisationUpdateDto = {
            name: faker.company.name(),
            type: randomOrganisationType(),
            numberOfCollaborators: faker.number.int({ max: 100 }),
          }

          nock(process.env.BREVO_URL!)
            .post('/v3/contacts')
            .reply(200)
            .post('/v3/contacts/lists/27/contacts/remove')
            .reply(200)

          const response = await agent
            .put(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            ...organisation,
            ...payload,
            updatedAt: expect.any(String),
          })
        })

        describe('And update administrator opt in for communications', () => {
          test('Then it updates organisation administrator in brevo', async () => {
            const payload: OrganisationUpdateDto = {
              name: faker.company.name(),
              type: randomOrganisationType(),
              numberOfCollaborators: faker.number.int({ max: 100 }),
              administrators: [
                {
                  optedInForCommunications: true,
                },
              ],
            }

            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post('/v3/contacts', {
                email,
                listIds: [27],
                attributes: {
                  USER_ID: userId,
                  IS_ORGANISATION_ADMIN: true,
                  ORGANISATION_NAME: payload.name,
                  ORGANISATION_SLUG: organisation.slug,
                  LAST_POLL_PARTICIPANTS_NUMBER: 0,
                  OPT_IN: true,
                },
                updateEnabled: true,
              })
              .reply(200)

            await agent
              .put(url.replace(':organisationIdOrSlug', organisationId))
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.OK)

            await EventBus.flush()

            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And update administrator opt out for communications', () => {
          test('Then it updates organisation administrator in brevo', async () => {
            const payload: OrganisationUpdateDto = {
              name: faker.company.name(),
              type: randomOrganisationType(),
              numberOfCollaborators: faker.number.int({ max: 100 }),
              administrators: [
                {
                  optedInForCommunications: false,
                },
              ],
            }

            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post('/v3/contacts', {
                email,
                attributes: {
                  USER_ID: userId,
                  IS_ORGANISATION_ADMIN: true,
                  ORGANISATION_NAME: payload.name,
                  ORGANISATION_SLUG: organisation.slug,
                  LAST_POLL_PARTICIPANTS_NUMBER: 0,
                  OPT_IN: false,
                },
                updateEnabled: true,
              })
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove', {
                emails: [email],
              })
              .reply(200)

            await agent
              .put(url.replace(':organisationIdOrSlug', organisationId))
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.OK)

            await EventBus.flush()

            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And no data in the update', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the unchanged group`, async () => {
            nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove')
              .reply(200)

            const response = await agent
              .put(url.replace(':organisationIdOrSlug', organisationId))
              .set('cookie', cookie)
              .send({})
              .expect(StatusCodes.OK)

            expect(response.body).toEqual(organisation)
          })
        })

        describe('And using the organisation slug', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the updated organisation`, async () => {
            const payload: OrganisationUpdateDto = {
              name: faker.company.name(),
              type: randomOrganisationType(),
              numberOfCollaborators: faker.number.int({ max: 100 }),
            }

            nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/27/contacts/remove')
              .reply(200)

            const response = await agent
              .put(url.replace(':organisationIdOrSlug', organisationSlug))
              .set('cookie', cookie)
              .send(payload)
              .expect(StatusCodes.OK)

            expect(response.body).toEqual({
              ...organisation,
              ...payload,
              updatedAt: expect.any(String),
            })
          })
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          vi.spyOn(prisma, '$transaction').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent
            .put(
              url.replace(
                ':organisationIdOrSlug',
                faker.database.mongodbObjectId()
              )
            )
            .set('cookie', cookie)
            .send({
              name: faker.company.name(),
              type: randomOrganisationType(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Organisation update failed',
            databaseError
          )
        })
      })
    })

    describe('When updating administrator email', () => {
      let organisation: Awaited<ReturnType<typeof createOrganisation>>
      let organisationId: string

      beforeEach(async () => {
        organisation = await createOrganisation({ agent, cookie })
        ;({ id: organisationId } = organisation)
      })

      describe('And no verification code', () => {
        test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
          const payload: OrganisationUpdateDto = {
            administrators: [
              {
                email: faker.internet.email(),
              },
            ],
          }

          const response = await agent
            .put(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.FORBIDDEN)

          expect(response.text).toEqual(
            'Forbidden ! Cannot update administrator email without a verification code.'
          )
        })
      })

      describe('And invalid verification code', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          const payload: OrganisationUpdateDto = {
            administrators: [
              {
                email: faker.internet.email(),
              },
            ],
          }

          await agent
            .put(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .query({
              code: '42',
            })
            .send(payload)
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And verification code does not exist', () => {
        test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
          const payload: OrganisationUpdateDto = {
            administrators: [
              {
                email: faker.internet.email(),
              },
            ],
          }

          const response = await agent
            .put(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .query({
              code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            })
            .send(payload)
            .expect(StatusCodes.FORBIDDEN)

          expect(response.text).toEqual(
            'Forbidden ! Invalid verification code.'
          )
        })
      })

      describe('And verification code does exist', () => {
        let email: string
        let code: string

        beforeEach(async () => {
          email = faker.internet.email().toLocaleLowerCase()
          ;({ code } = await createVerificationCode({
            agent,
            verificationCode: { userId, email },
          }))
        })

        test(`Then it returns a ${StatusCodes.OK} response with the updated organisation and a new cookie`, async () => {
          const administratorPayload = {
            email,
            name: faker.person.fullName(),
            telephone: faker.phone.number(),
            position: faker.person.jobDescriptor(),
            optedInForCommunications: true,
          }
          const payload: OrganisationUpdateDto = {
            administrators: [administratorPayload],
          }

          nock(process.env.BREVO_URL!).post('/v3/contacts').reply(200)
          nock(baseURL).post('/api/v1/personnes').reply(200)

          const response = await agent
            .put(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .query({
              code,
            })
            .send(payload)
            .expect(StatusCodes.OK)

          const [existingAdministrator] = organisation.administrators
          expect(response.body).toEqual({
            ...organisation,
            administrators: [
              {
                ...existingAdministrator,
                ...administratorPayload,
                updatedAt: expect.any(String),
              },
            ],
            updatedAt: expect.any(String),
          })

          // Cookies are kept in supertest
          const [, newCookie] = response.headers['set-cookie']
          const token = newCookie.split(';').shift()?.replace('ngcjwt=', '')

          expect(jwt.decode(token!)).toEqual({
            userId,
            email,
            exp: expect.any(Number),
            iat: expect.any(Number),
          })
        })

        test('Then it adds or updates the contact in connect', async () => {
          const administratorPayload = {
            email,
            name: faker.person.fullName(),
            telephone: faker.phone.number(),
            position: faker.person.jobDescriptor(),
            optedInForCommunications: true,
          }
          const payload: OrganisationUpdateDto = {
            administrators: [administratorPayload],
          }

          nock(process.env.BREVO_URL!).post('/v3/contacts').reply(200)
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
            .put(url.replace(':organisationIdOrSlug', organisationId))
            .set('cookie', cookie)
            .query({
              code,
            })
            .send(payload)
            .expect(StatusCodes.OK)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })

        describe('And Organisation does exist for the target email', () => {
          beforeEach(async () => {
            const { cookie } = await login({
              agent,
              verificationCode: { email },
            })
            await createOrganisation({ agent, cookie })
          })

          test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
            const payload: OrganisationUpdateDto = {
              administrators: [
                {
                  email,
                },
              ],
            }

            const response = await agent
              .put(url.replace(':organisationIdOrSlug', organisationId))
              .set('cookie', cookie)
              .query({
                code,
              })
              .send(payload)
              .expect(StatusCodes.FORBIDDEN)

            expect(response.text).toEqual(
              'Forbidden ! This email already belongs to another organisation.'
            )
          })
        })
      })
    })
  })
})
