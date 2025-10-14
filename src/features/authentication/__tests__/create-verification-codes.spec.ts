import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../adapters/brevo/__tests__/fixtures/server.fixture.js'
import { prisma } from '../../../adapters/prisma/client.js'
import * as prismaTransactionAdapter from '../../../adapters/prisma/transaction.js'
import app from '../../../app.js'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture.js'
import { EventBus } from '../../../core/event-bus/event-bus.js'
import { Locales } from '../../../core/i18n/constant.js'
import logger from '../../../logger.js'
import * as authenticationService from '../authentication.service.js'
import { AUTHENTICATION_MODE } from '../authentication.service.js'
import type { VerificationCodeCreateDto } from '../verification-codes.validator.js'
import { CREATE_VERIFICATION_CODE_ROUTE } from './fixtures/verification-codes.fixture.js'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_VERIFICATION_CODE_ROUTE

  afterEach(() => prisma.verificationCode.deleteMany())

  describe('When creating a verification-code', () => {
    let code: string

    beforeEach(() => {
      code = faker.number.int({ min: 100000, max: 999999 }).toString()
      vi.mocked(
        authenticationService
      ).generateRandomVerificationCode.mockReturnValueOnce(code)
    })

    afterEach(() => {
      vi.mocked(
        authenticationService
      ).generateRandomVerificationCode.mockRestore()
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

      mswServer.use(brevoSendEmail(), brevoUpdateContact())

      const response = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        expirationDate: expect.any(String),
        ...payload,
      })
    })

    test('Then it stores a verification code valid 1 hour in database', async () => {
      const payload: VerificationCodeCreateDto = {
        userId: faker.string.uuid(),
        email: faker.internet.email().toLocaleLowerCase(),
      }

      mswServer.use(brevoSendEmail(), brevoUpdateContact())

      const now = Date.now()
      const oneHour = 1000 * 60 * 60

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
        expirationDate: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        ...payload,
      })

      // Hopefully code gets created under 1 second
      expect(
        Math.floor(
          (createdVerificationCode!.expirationDate.getTime() - now - oneHour) /
            1000
        )
      ).toBe(0)
    })

    test('Then it sends an email with the code', async () => {
      const email = faker.internet.email().toLocaleLowerCase()

      mswServer.use(
        brevoSendEmail({
          expectBody: {
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
          },
        }),
        brevoUpdateContact()
      )

      await agent.post(url).send({
        userId: faker.string.uuid(),
        email,
      })

      await EventBus.flush()
    })

    test('Then it updates brevo contact', async () => {
      const email = faker.internet.email().toLocaleLowerCase()
      const userId = faker.string.uuid()

      mswServer.use(
        brevoSendEmail(),
        brevoUpdateContact({
          expectBody: {
            email,
            attributes: {
              USER_ID: userId,
            },
            updateEnabled: true,
          },
        })
      )

      await agent.post(url).send({
        userId,
        email,
      })

      await EventBus.flush()
    })

    describe(`And ${Locales.en} locale`, () => {
      test('Then it sends an email with the code', async () => {
        const email = faker.internet.email().toLocaleLowerCase()

        mswServer.use(
          brevoSendEmail({
            expectBody: {
              to: [
                {
                  name: email,
                  email,
                },
              ],
              templateId: 125,
              params: {
                VERIFICATION_CODE: code,
              },
            },
          }),
          brevoUpdateContact()
        )

        await agent
          .post(url)
          .send({
            userId: faker.string.uuid(),
            email,
          })
          .query({
            locale: Locales.en,
          })

        await EventBus.flush()
      })
    })

    describe(`And ${AUTHENTICATION_MODE.signUp} mode`, () => {
      describe('And new user', () => {
        test(`Then it returns a ${StatusCodes.CREATED} response with the created verification code`, async () => {
          const payload = {
            userId: faker.string.uuid(),
            email: faker.internet.email().toLocaleLowerCase(),
          }

          mswServer.use(brevoSendEmail(), brevoUpdateContact())

          const response = await agent
            .post(url)
            .send(payload)
            .query({
              mode: AUTHENTICATION_MODE.signUp,
            })
            .expect(StatusCodes.CREATED)

          expect(response.body).toEqual({
            id: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            expirationDate: expect.any(String),
            ...payload,
          })
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
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test('Then it logs the exception', async () => {
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
