import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import type { VerificationCodeCreateDto } from '../verification-codes.validator'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/verification-codes/v1'

  describe('When creating a verification-code', () => {
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

      const response = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: null,
        expirationDate: expect.any(String),
        ...payload,
      })
    })

    test('It should store a verification code in database', async () => {
      const payload: VerificationCodeCreateDto = {
        userId: faker.string.uuid(),
        email: faker.internet.email(),
      }

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
        code: expect.any(String),
        createdAt: expect.anything(),
        updatedAt: null,
        expirationDate: expect.anything(),
        ...payload,
      })
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
