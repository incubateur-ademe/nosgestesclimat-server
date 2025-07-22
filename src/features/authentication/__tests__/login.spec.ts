import { faker } from '@faker-js/faker'
import type { VerificationCode } from '@prisma/client'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { brevoUpdateContact } from '../../../adapters/brevo/__tests__/fixtures/server.fixture.js'
import { prisma } from '../../../adapters/prisma/client.js'
import * as prismaTransactionAdapter from '../../../adapters/prisma/transaction.js'
import app from '../../../app.js'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture.js'
import { EventBus } from '../../../core/event-bus/event-bus.js'
import logger from '../../../logger.js'
import { LOGIN_ROUTE } from './fixtures/login.fixture.js'
import { createVerificationCode } from './fixtures/verification-codes.fixture.js'

vi.mock('../../../adapters/prisma/transaction', async () => ({
  ...(await vi.importActual('../../../adapters/prisma/transaction')),
}))

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = LOGIN_ROUTE

  afterEach(() => prisma.verificationCode.deleteMany())

  describe('When logging in', () => {
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
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
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
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid code', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
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
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
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

      test(`Then it returns a ${StatusCodes.OK} response with a cookie`, async () => {
        verificationCode = await createVerificationCode({ agent })

        const payload = {
          userId: verificationCode.userId,
          email: verificationCode.email,
          code: verificationCode.code,
        }

        mswServer.use(brevoUpdateContact())

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

      test(`Then it updates brevo contact`, async () => {
        verificationCode = await createVerificationCode({ agent })

        const payload = {
          userId: verificationCode.userId,
          email: verificationCode.email,
          code: verificationCode.code,
        }

        mswServer.use(
          brevoUpdateContact({
            expectBody: {
              email: verificationCode.email,
              attributes: {
                USER_ID: verificationCode.userId,
              },
              updateEnabled: true,
            },
          })
        )

        await agent.post(url).send(payload).expect(StatusCodes.OK)

        await EventBus.flush()
      })

      describe('And is expired', () => {
        test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
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
        vi.spyOn(prismaTransactionAdapter, 'transaction').mockRejectedValueOnce(
          databaseError
        )
      })

      afterEach(() => {
        vi.spyOn(prismaTransactionAdapter, 'transaction').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email: faker.internet.email(),
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
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
