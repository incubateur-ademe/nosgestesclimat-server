import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import * as authenticationService from '../authentication.service'
import type { VerificationCodeCreateDto } from '../verification-codes.validator'
import { CREATE_VERIFICATION_CODE_ROUTE } from './fixtures/verification-codes.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_VERIFICATION_CODE_ROUTE

  afterEach(() => prisma.verificationCode.deleteMany())

  describe('When creating a verification-code', () => {
    let code: string
    let expirationDate: Date

    beforeEach(() => {
      code = faker.number.int({ min: 100000, max: 999999 }).toString()
      expirationDate = dayjs().add(1, 'hour').toDate()
      jest
        .mocked(authenticationService)
        .generateVerificationCodeAndExpiration.mockReturnValueOnce({
          code,
          expirationDate,
        })
    })

    afterEach(() => {
      jest
        .mocked(authenticationService)
        .generateVerificationCodeAndExpiration.mockRestore()
    })

    describe('And no data provided', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.alpha(34),
            email: faker.internet.email(),
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid email', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: 'Je ne donne jamais mon email',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    test(`Then it returns a ${StatusCodes.CREATED} response with the created verification code`, async () => {
      const payload = {
        userId: faker.string.uuid(),
        email: faker.internet.email().toLocaleLowerCase(),
      }

      nock(process.env.BREVO_URL!)
        .post('/v3/smtp/email')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)

      const response = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        expirationDate: expirationDate.toISOString(),
        ...payload,
      })
    })

    test('Then it stores a verification code in database', async () => {
      const payload: VerificationCodeCreateDto = {
        userId: faker.string.uuid(),
        email: faker.internet.email().toLocaleLowerCase(),
      }

      nock(process.env.BREVO_URL!)
        .post('/v3/smtp/email')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)

      await agent.post(url).send(payload)

      const createdVerificationCode = await prisma.verificationCode.findFirst({
        where: {
          email: payload.email,
          userId: payload.userId,
        },
      })

      expect(createdVerificationCode).toEqual({
        id: expect.any(String),
        code,
        expirationDate,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        ...payload,
      })
    })

    test('Then it sends an email with the code', async () => {
      const email = faker.internet.email().toLocaleLowerCase()

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
          templateId: 66,
          params: {
            VERIFICATION_CODE: code,
          },
        })
        .reply(200)
        .post('/v3/contacts')
        .reply(200)

      await agent.post(url).send({
        userId: faker.string.uuid(),
        email,
      })

      await EventBus.flush()

      expect(scope.isDone()).toBeTruthy()
    })

    test('Then it updates brevo contact', async () => {
      const email = faker.internet.email().toLocaleLowerCase()
      const userId = faker.string.uuid()

      const scope = nock(process.env.BREVO_URL!, {
        reqheaders: {
          'api-key': process.env.BREVO_API_KEY!,
        },
      })
        .post('/v3/contacts', {
          email,
          attributes: {
            USER_ID: userId,
          },
          updateEnabled: true,
        })
        .reply(200)
        .post('/v3/smtp/email')
        .reply(200)

      await agent.post(url).send({
        userId,
        email,
      })

      await EventBus.flush()

      expect(scope.isDone()).toBeTruthy()
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma, '$transaction').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: faker.internet.email(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent.post(url).send({
          userId: faker.string.uuid(),
          email: faker.internet.email(),
        })

        expect(logger.error).toHaveBeenCalledWith(
          'VerificationCode creation failed',
          databaseError
        )
      })
    })
  })
})
