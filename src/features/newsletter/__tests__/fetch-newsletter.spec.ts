import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { ZodError } from 'zod'
import { formatBrevoDate } from '../../../adapters/brevo/__tests__/fixtures/formatBrevoDate'
import { brevoGetNewsletter } from '../../../adapters/brevo/__tests__/fixtures/server.fixture'
import { redis } from '../../../adapters/redis/client'
import { KEYS } from '../../../adapters/redis/constant'
import app from '../../../app'
import {
  mswServer,
  resetMswServer,
} from '../../../core/__tests__/fixtures/server.fixture'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/newsletters/v1/:newsletterId'

  describe('When fetching the newsletter stats', () => {
    const newsletterId = '22'
    const newsletterName = faker.company.buzzPhrase()
    const newsletterTotalSubscribers = faker.number.int()

    afterEach(
      () =>
        new Promise<void>((res, rej) => {
          redis.keys(`${KEYS.brevoNewsletter}_*`, async (err, keys) =>
            err
              ? rej(err)
              : redis.del(keys || [], (err) => (err ? rej(err) : res()))
          )
        })
    )

    describe('And invalid newsletterId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':newsletterId', 'invalid-newsletterId'))
          .expect(StatusCodes.BAD_REQUEST)

        await agent
          .get(url.replace(':newsletterId', 'NaN'))
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    test(`Then it returns a ${StatusCodes.OK} response with the mapped brevo response`, async () => {
      mswServer.use(
        brevoGetNewsletter(newsletterId, {
          customResponses: [
            {
              body: {
                id: +newsletterId,
                name: newsletterName,
                startDate: formatBrevoDate(faker.date.recent()),
                endDate: formatBrevoDate(faker.date.future()),
                totalBlacklisted: faker.number.int(),
                totalSubscribers: newsletterTotalSubscribers,
                uniqueSubscribers: faker.number.int(),
                folderId: faker.number.int(),
                createdAt: formatBrevoDate(faker.date.past()),
                dynamicList: faker.datatype.boolean(),
                campaignStats: [],
              },
            },
          ],
        })
      )

      const { body } = await agent
        .get(url.replace(':newsletterId', newsletterId))
        .expect(StatusCodes.OK)

      await EventBus.flush()

      expect(body).toEqual({
        id: +newsletterId,
        name: newsletterName,
        totalSubscribers: newsletterTotalSubscribers,
      })
    })

    describe('And newsletter does not exists', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} response with the mapped brevo response`, async () => {
        mswServer.use(
          brevoGetNewsletter(newsletterId, {
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

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.NOT_FOUND)

        await EventBus.flush()

        expect(body).toEqual({
          code: 'document_not_found',
          message: 'List ID does not exist',
        })
      })
    })

    describe('And network error', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} response`, async () => {
        mswServer.use(
          brevoGetNewsletter(newsletterId, {
            networkError: true,
          })
        )

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        await EventBus.flush()

        expect(body).toEqual({})
      })
    })

    describe('And brevo is down', () => {
      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response after retries`, async () => {
        mswServer.use(
          brevoGetNewsletter(newsletterId, {
            customResponses: [
              { status: StatusCodes.INTERNAL_SERVER_ERROR },
              { status: StatusCodes.INTERNAL_SERVER_ERROR },
              { status: StatusCodes.INTERNAL_SERVER_ERROR },
              { status: StatusCodes.INTERNAL_SERVER_ERROR },
            ],
          })
        )

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        await EventBus.flush()

        expect(body).toEqual({})
      })

      describe('And cache does exist', () => {
        beforeEach(async () => {
          mswServer.use(
            brevoGetNewsletter(newsletterId, {
              customResponses: [
                {
                  body: {
                    id: +newsletterId,
                    name: newsletterName,
                    startDate: formatBrevoDate(faker.date.recent()),
                    endDate: formatBrevoDate(faker.date.future()),
                    totalBlacklisted: faker.number.int(),
                    totalSubscribers: newsletterTotalSubscribers,
                    uniqueSubscribers: faker.number.int(),
                    folderId: faker.number.int(),
                    createdAt: formatBrevoDate(faker.date.past()),
                    dynamicList: faker.datatype.boolean(),
                    campaignStats: [],
                  },
                },
              ],
            })
          )

          await agent
            .get(url.replace(':newsletterId', newsletterId))
            .expect(StatusCodes.OK)

          await EventBus.flush()

          resetMswServer()
        })

        test(`Then it returns a  ${StatusCodes.OK} response with the mapped brevo response`, async () => {
          const { body } = await agent
            .get(url.replace(':newsletterId', newsletterId))
            .expect(StatusCodes.OK)

          await EventBus.flush()

          expect(body).toEqual({
            id: +newsletterId,
            name: newsletterName,
            totalSubscribers: newsletterTotalSubscribers,
          })
        })
      })
    })

    describe('And brevo interface changes', () => {
      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response and logs the exception`, async () => {
        mswServer.use(
          brevoGetNewsletter(newsletterId, {
            customResponses: [{ body: {} }],
          })
        )

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        await EventBus.flush()

        expect(body).toEqual({})
        expect(logger.error).toHaveBeenCalledWith(
          'Newsletter fetch failed',
          expect.any(ZodError)
        )
      })
    })
  })
})
