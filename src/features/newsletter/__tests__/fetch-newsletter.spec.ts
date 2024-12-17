import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { ZodError } from 'zod'
import app from '../../../app'
import logger from '../../../logger'

// Brevo are evil
const formatBrevoDate = (date: Date) => {
  const timezoneOffset = -date.getTimezoneOffset()
  const sign = timezoneOffset >= 0 ? '+' : '-'
  const hours = Math.floor(Math.abs(timezoneOffset) / 60)
    .toString()
    .padStart(2, '0')
  const minutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0')

  return `${date.toISOString().slice(0, -1)}${sign}${hours}:${minutes}`
}

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/newsletters/v1/:newsletterId'

  describe('When fetching the newsletter stats', () => {
    const newsletterId = '22'
    const newsletterName = faker.company.buzzPhrase()
    const newsletterTotalSubscribers = faker.number.int()

    describe('And invalid newsletterId', () => {
      it(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':newsletterId', 'invalid-newsletterId'))
          .expect(StatusCodes.BAD_REQUEST)

        await agent
          .get(url.replace(':newsletterId', 'NaN'))
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    it(`Then it returns a ${StatusCodes.OK} response with the mapped brevo response`, async () => {
      const scope = nock(process.env.BREVO_URL!, {
        reqheaders: {
          'api-key': process.env.BREVO_API_KEY!,
        },
      })
        .get(`/v3/contacts/lists/${newsletterId}`)
        .reply(200, {
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
        })

      const { body } = await agent
        .get(url.replace(':newsletterId', newsletterId))
        .expect(StatusCodes.OK)

      expect(body).toEqual({
        id: +newsletterId,
        name: newsletterName,
        totalSubscribers: newsletterTotalSubscribers,
      })
      expect(scope.isDone()).toBeTruthy()
    })

    describe('And newsletter does not exists', () => {
      it(`Then it returns a ${StatusCodes.NOT_FOUND} response with the mapped brevo response`, async () => {
        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .get(`/v3/contacts/lists/${newsletterId}`)
          .reply(404, {
            code: 'document_not_found',
            message: 'List ID does not exist',
          })

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.NOT_FOUND)

        expect(body).toEqual({
          code: 'document_not_found',
          message: 'List ID does not exist',
        })
        expect(scope.isDone()).toBeTruthy()
      })
    })

    describe('And network error', () => {
      it(`Then it returns a ${StatusCodes.NOT_FOUND} response`, async () => {
        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .get(`/v3/contacts/lists/${newsletterId}`)
          .replyWithError({
            message: 'Network error occurred',
            code: 'ERR_CONNECTION_REFUSED',
          })

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(body).toEqual({})
        expect(scope.isDone()).toBeTruthy()
      })
    })

    describe('And brevo is down', () => {
      it(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response after retries`, async () => {
        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .get(`/v3/contacts/lists/${newsletterId}`)
          .reply(500)
          .get(`/v3/contacts/lists/${newsletterId}`)
          .reply(500)
          .get(`/v3/contacts/lists/${newsletterId}`)
          .reply(500)
          .get(`/v3/contacts/lists/${newsletterId}`)
          .reply(500)

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(body).toEqual({})
        expect(scope.isDone()).toBeTruthy()
      })
    })

    describe('And brevo interface changes', () => {
      it(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response and logs the exception`, async () => {
        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .get(`/v3/contacts/lists/${newsletterId}`)
          .reply(200)

        const { body } = await agent
          .get(url.replace(':newsletterId', newsletterId))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(body).toEqual({})
        expect(scope.isDone()).toBeTruthy()
        expect(logger.error).toHaveBeenCalledWith(
          'Newsletter fetch failed',
          expect.any(ZodError)
        )
      })
    })
  })
})