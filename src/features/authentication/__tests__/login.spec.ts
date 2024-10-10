import { faker } from '@faker-js/faker'
import type { VerificationCode } from '@prisma/client'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { createVerificationCode } from './fixtures/verification-codes.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/authentication/v1/login'

  describe('When logging in', () => {
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
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
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
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid code', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: faker.internet.email(),
            code: '42',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And verification code does not exist', () => {
      test(`Then it should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: faker.internet.email(),
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
          })
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })

    describe('And verification code does exist', () => {
      let verificationCode: VerificationCode

      test(`It should return a ${StatusCodes.OK} response with a cookie`, async () => {
        verificationCode = await createVerificationCode({ agent })

        const payload = {
          userId: verificationCode.userId,
          email: verificationCode.email,
          code: verificationCode.code,
        }

        const response = await agent
          .post(url)
          .send(payload)
          .expect(StatusCodes.OK)

        const [cookie] = response.headers['set-cookie']
        const token = cookie.split(';').shift()?.replace('ngcjwt=', '')

        expect(jwt.decode(token!)).toEqual({
          userId: verificationCode.userId,
          email: verificationCode.email,
          exp: expect.any(Number),
          iat: expect.any(Number),
        })
      })

      describe('And is expired', () => {
        test(`Then it should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
          verificationCode = await createVerificationCode({
            agent,
            expirationDate: dayjs().subtract(1, 'second').toDate(),
          })

          await agent
            .post(url)
            .send({
              userId: verificationCode.userId,
              email: verificationCode.email,
              code: verificationCode.code,
            })
            .expect(StatusCodes.UNAUTHORIZED)
        })
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest
          .spyOn(prisma.verificationCode, 'findFirstOrThrow')
          .mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma.verificationCode, 'findFirstOrThrow').mockRestore()
      })

      test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: faker.internet.email(),
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it should log the exception`, async () => {
        await agent.post(url).send({
          userId: faker.string.uuid(),
          email: faker.internet.email(),
          code: faker.number.int({ min: 100000, max: 999999 }).toString(),
        })

        expect(logger.error).toHaveBeenCalledWith('Login failed', databaseError)
      })
    })
  })
})
