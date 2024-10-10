import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import * as authenticationService from '../authentication.service'
import type { VerificationCodeCreateDto } from '../verification-codes.validator'
import { CREATE_VERIFICATION_CODE_ROUTE } from './fixtures/verification-codes.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_VERIFICATION_CODE_ROUTE

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
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid userId', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
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
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: 'Je ne donne jamais mon email',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    test(`It should return a ${StatusCodes.CREATED} response with the created verification code`, async () => {
      const payload = {
        userId: faker.string.uuid(),
        email: faker.internet.email(),
      }

      nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

      const response = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: null,
        expirationDate: expirationDate.toISOString(),
        ...payload,
      })
    })

    test('It should store a verification code in database', async () => {
      const payload: VerificationCodeCreateDto = {
        userId: faker.string.uuid(),
        email: faker.internet.email(),
      }

      nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

      await agent.post(url).send(payload)

      const createdVerificationCode = await prisma.verificationCode.findFirst({
        where: {
          email: payload.email,
          userId: payload.userId,
        },
      })

      // dates are not instance of Date due to jest
      expect(createdVerificationCode).toEqual({
        id: expect.any(String),
        code,
        expirationDate,
        createdAt: expect.anything(),
        updatedAt: null,
        ...payload,
      })
    })

    test('It should send an email with the code', async () => {
      const email = faker.internet.email()

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

      await agent.post(url).send({
        userId: faker.string.uuid(),
        email,
      })

      expect(scope.isDone()).toBeTruthy()
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest
          .spyOn(prisma.verificationCode, 'create')
          .mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma.verificationCode, 'create').mockRestore()
      })

      test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: faker.internet.email(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it should log the exception`, async () => {
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
