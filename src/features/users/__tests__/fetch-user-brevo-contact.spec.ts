import { faker } from '@faker-js/faker'
import { AxiosError } from 'axios'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { ZodError } from 'zod'
import { formatBrevoDate } from '../../../adapters/brevo/__tests__/fixtures/formatBrevoDate'
import { brevoGetContact } from '../../../adapters/brevo/__tests__/fixtures/server.fixture'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture'
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
          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: {
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
                  },
                },
              ],
            })
          )

          const { body } = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          await EventBus.flush()

          expect(body).toEqual({
            id: contactId,
            email,
            listIds,
          })
        })

        describe('And user contact does not exist', () => {
          test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  {
                    body: {
                      code: 'document_not_found',
                      message: 'List ID does not exist',
                    },
                    status: StatusCodes.NOT_FOUND,
                  },
                ],
              })
            )

            await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.NOT_FOUND)

            await EventBus.flush()
          })
        })

        describe('And network error', () => {
          test(`Then it returns a ${StatusCodes.NOT_FOUND} response`, async () => {
            mswServer.use(brevoGetContact(email, { networkError: true }))

            const { body } = await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
          })
        })

        describe('And brevo is down', () => {
          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response after retries and logs the exception`, async () => {
            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  { status: StatusCodes.INTERNAL_SERVER_ERROR },
                  { status: StatusCodes.INTERNAL_SERVER_ERROR },
                  { status: StatusCodes.INTERNAL_SERVER_ERROR },
                  { status: StatusCodes.INTERNAL_SERVER_ERROR },
                ],
              })
            )

            const { body } = await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(logger.error).toHaveBeenCalledWith(
              'User contact fetch failed',
              expect.any(AxiosError)
            )
          })
        })

        describe('And brevo interface changes', () => {
          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response and logs the exception`, async () => {
            mswServer.use(
              brevoGetContact(email, { customResponses: [{ body: {} }] })
            )

            const { body } = await agent
              .get(url.replace(':userId', userId))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
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
