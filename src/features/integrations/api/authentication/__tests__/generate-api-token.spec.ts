import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../../../adapters/prisma/client'
import app from '../../../../../app'
import logger from '../../../../../logger'
import * as authenticationService from '../../../../authentication/authentication.service'
import { createIntegrationEmailWhitelist } from './fixtures/authentication.fixtures'

describe('Given a NGC integrations API user', () => {
  const agent = supertest(app)
  const url = '/integrations-api/v1/tokens'

  afterEach(async () => {
    await prisma.integrationWhitelist.deleteMany()
    await Promise.all([
      prisma.verificationCode.deleteMany(),
      prisma.integrationApiScope.deleteMany(),
    ])
  })

  describe('When asking for an API token', () => {
    describe('And no data provided', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid email', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            email: 'Je ne donne jamais mon email',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And email is not whitelisted', () => {
      test(`Then it returns a ${StatusCodes.CREATED} response`, async () => {
        await agent
          .post(url)
          .send({
            email: faker.internet.email(),
          })
          .expect(StatusCodes.CREATED)
      })
    })

    describe('And email is whitelisted', () => {
      let code: string
      let email: string
      let expirationDate: Date

      beforeEach(async () => {
        ;({ emailPattern: email } = await createIntegrationEmailWhitelist({
          prisma,
        }))
        code = faker.number.int({ min: 100000, max: 999999 }).toString()
        expirationDate = dayjs().add(1, 'hour').toDate()
        jest
          .mocked(authenticationService)
          .generateVerificationCodeAndExpiration.mockReturnValueOnce({
            code,
            expirationDate,
          })
      })

      test(`Then it returns a ${StatusCodes.CREATED} response`, async () => {
        nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

        await agent
          .post(url)
          .send({
            email,
          })
          .expect(StatusCodes.CREATED)
      })

      test(`Then it stores a verification code in database`, async () => {
        nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

        await agent
          .post(url)
          .send({
            email,
          })
          .expect(StatusCodes.CREATED)

        const createdVerificationCode = await prisma.verificationCode.findFirst(
          {
            where: {
              email,
            },
          }
        )

        expect(createdVerificationCode).toEqual({
          id: expect.any(String),
          code,
          email,
          expirationDate,
          userId: null,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      })

      test(`Then it sends an email to recover the API token`, async () => {
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
            templateId: 116,
            params: {
              API_TOKEN_URL: `https://nosgestesclimat.fr/integrations-api/v1/tokens?code=${code}&email=${encodeURIComponent(email)}`,
            },
          })
          .reply(200)

        await agent
          .post(url)
          .send({
            email,
          })
          .expect(StatusCodes.CREATED)

        expect(scope.isDone()).toBeTruthy()
      })

      describe('And custom user origin (preprod)', () => {
        test('Then it sends a join email', async () => {
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
              templateId: 116,
              params: {
                API_TOKEN_URL: `https://preprod.nosgestesclimat.fr/integrations-api/v1/tokens?code=${code}&email=${encodeURIComponent(email)}`,
              },
            })
            .reply(200)

          await agent
            .post(url)
            .set('origin', 'https://preprod.nosgestesclimat.fr')
            .send({
              email,
            })
            .expect(StatusCodes.CREATED)

          expect(scope.isDone()).toBeTruthy()
        })
      })
    })

    describe('And email domain whitelist', () => {
      let code: string
      let email: string
      let expirationDate: Date

      beforeEach(async () => {
        email = faker.internet.email().toLocaleLowerCase()
        const [, emailDomain] = email.split('@')
        await createIntegrationEmailWhitelist({
          integrationWhitelist: {
            emailPattern: `*@${emailDomain}`,
          },
          prisma,
        })
        code = faker.number.int({ min: 100000, max: 999999 }).toString()
        expirationDate = dayjs().add(1, 'hour').toDate()
        jest
          .mocked(authenticationService)
          .generateVerificationCodeAndExpiration.mockReturnValueOnce({
            code,
            expirationDate,
          })
      })

      test(`Then it returns a ${StatusCodes.CREATED} response`, async () => {
        nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

        await agent
          .post(url)
          .send({
            email,
          })
          .expect(StatusCodes.CREATED)
      })
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
            email: faker.internet.email(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent
          .post(url)
          .send({
            email: faker.internet.email(),
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'API token generation failed',
          databaseError
        )
      })
    })
  })
})
