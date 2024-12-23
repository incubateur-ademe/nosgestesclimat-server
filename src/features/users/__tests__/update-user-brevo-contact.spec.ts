import { faker } from '@faker-js/faker'
import { AxiosError } from 'axios'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { ZodError } from 'zod'
import { formatBrevoDate } from '../../../adapters/brevo/__tests__/fixtures/formatBrevoDate'
import { ListIds } from '../../../adapters/brevo/constant'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { createSimulation } from '../../simulations/__tests__/fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/users/v1/:userId/brevo-contact'

  afterEach(() => prisma.user.deleteMany())

  describe('When updating his/her brevo contact', () => {
    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.alpha(34)))
          .send({
            email: faker.internet.email(),
            listIds: [],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid email', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({
            email: 'Je ne donne jamais mon email',
            listIds: [],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid newsletters', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({
            email: faker.internet.email(),
            listIds: [-1],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And user does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({
            email: faker.internet.email(),
            listIds: [],
          })
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And user does exist', () => {
      let userId: string

      describe('And has no email', () => {
        beforeEach(async () => {
          ;({
            user: { id: userId },
          } = await createSimulation({
            agent,
          }))
        })

        test(`Then it sets the email and returns a ${StatusCodes.OK} response with the mapped brevo contact`, async () => {
          const email = faker.internet.email()
          const listIds: ListIds[] = []
          const contactId = faker.number.int()

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post(`/v3/contacts`, {
              email,
              listIds,
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              updateEnabled: true,
            })
            .reply(200, '')
            .get(`/v3/contacts/${encodeURIComponent(email)}`)
            .reply(200, {
              email,
              id: contactId,
              emailBlacklisted: faker.datatype.boolean(),
              smsBlacklisted: faker.datatype.boolean(),
              createdAt: formatBrevoDate(faker.date.past()),
              modifiedAt: formatBrevoDate(faker.date.recent()),
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              listIds,
              statistics: {},
            })

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              email,
              listIds: [],
            })
            .expect(StatusCodes.OK)

          const user = await prisma.user.findUniqueOrThrow({
            where: {
              id: userId,
            },
            select: {
              email: true,
            },
          })

          expect(body).toEqual({
            id: contactId,
            email,
            listIds,
          })
          expect(user.email).toBe(email)
          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And has an email', () => {
        let email: string
        let contactId: number
        let listIds: number[]

        beforeEach(async () => {
          ;({
            user: { id: userId, email },
          } = await createSimulation({
            agent,
            simulation: {
              user: {
                email: faker.internet.email(),
              },
            },
          }))

          contactId = faker.number.int()
          listIds = [ListIds.MAIN_NEWSLETTER]
        })

        test(`Then it returns a ${StatusCodes.OK} response with the mapped brevo contact`, async () => {
          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post(`/v3/contacts`, {
              email,
              listIds,
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              updateEnabled: true,
            })
            .reply(200, '')
            .get(`/v3/contacts/${encodeURIComponent(email)}`)
            .reply(200, {
              email,
              id: contactId,
              emailBlacklisted: faker.datatype.boolean(),
              smsBlacklisted: faker.datatype.boolean(),
              createdAt: formatBrevoDate(faker.date.past()),
              modifiedAt: formatBrevoDate(faker.date.recent()),
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              listIds,
              statistics: {},
            })

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              email,
              listIds,
            })
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            id: contactId,
            email,
            listIds,
          })
          expect(scope.isDone()).toBeTruthy()
        })

        describe('And already has newsLetters', () => {
          test(`Then it unsubscribes unwanted newsletters and it returns a ${StatusCodes.OK} response with the mapped brevo contact`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .reply(200, '')
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(200, {
                email,
                id: contactId,
                emailBlacklisted: faker.datatype.boolean(),
                smsBlacklisted: faker.datatype.boolean(),
                createdAt: formatBrevoDate(faker.date.past()),
                modifiedAt: formatBrevoDate(faker.date.recent()),
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                listIds: [...listIds, ListIds.TRANSPORT_NEWSLETTER],
                statistics: {},
              })
              .post(
                `/v3/contacts/lists/${ListIds.TRANSPORT_NEWSLETTER}/contacts/remove`
              )
              .reply(200)

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                listIds,
              })
              .expect(StatusCodes.OK)

            expect(body).toEqual({
              id: contactId,
              email,
              listIds,
            })
            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And network error', () => {
          it(`Then it returns a ${StatusCodes.NOT_FOUND} response and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .replyWithError({
                message: 'Network error occurred',
                code: 'ERR_CONNECTION_REFUSED',
              })

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                listIds,
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User brevo contact update failed',
              expect.any(AxiosError)
            )
          })
        })

        describe('And brevo is down', () => {
          it(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response after retries and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .reply(500)
              .post(`/v3/contacts`)
              .reply(500)
              .post(`/v3/contacts`)
              .reply(500)
              .post(`/v3/contacts`)
              .reply(500)

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                listIds,
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User brevo contact update failed',
              expect.any(AxiosError)
            )
          })
        })

        describe('And brevo interface changes', () => {
          it(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .reply(200, '')
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(200)

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                listIds,
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User brevo contact update failed',
              expect.any(ZodError)
            )
          })
        })
      })
    })
  })
})
