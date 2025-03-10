import { faker } from '@faker-js/faker'
import { AxiosError } from 'axios'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { ZodError } from 'zod'
import { formatBrevoDate } from '../../../adapters/brevo/__tests__/fixtures/formatBrevoDate'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { createSimulation } from '../../simulations/__tests__/fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/users/v1/:userId/contact'

  afterEach(() => prisma.user.deleteMany())

  describe('When fetching the newsletter stats', () => {
    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.alpha(34)))
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And user does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
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

        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.NOT_FOUND)
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
          listIds = [faker.number.int(), faker.number.int()]
        })

        test(`Then it returns a ${StatusCodes.OK} response with the mapped user contact`, async () => {
          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
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
              },
              listIds,
              statistics: {},
            })

          const { body } = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          await EventBus.flush()

          expect(body).toEqual({
            id: contactId,
            email,
            listIds,
          })
          expect(scope.isDone()).toBeTruthy()
        })

        describe('And user contact does not exist', () => {
          test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(404, {
                code: 'document_not_found',
                message: 'List ID does not exist',
              })

            await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.NOT_FOUND)

            await EventBus.flush()

            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And network error', () => {
          test(`Then it returns a ${StatusCodes.NOT_FOUND} response`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .replyWithError({
                message: 'Network error occurred',
                code: 'ERR_CONNECTION_REFUSED',
              })

            const { body } = await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And brevo is down', () => {
          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response after retries and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(500)
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(500)
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(500)
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(500)

            const { body } = await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User contact fetch failed',
              expect.any(AxiosError)
            )
          })
        })

        describe('And brevo interface changes', () => {
          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(200)

            const { body } = await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User contact fetch failed',
              expect.any(ZodError)
            )
          })
        })
      })
    })
  })
})
