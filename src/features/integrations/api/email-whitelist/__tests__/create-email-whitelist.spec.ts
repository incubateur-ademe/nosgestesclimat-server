import { faker } from '@faker-js/faker'
import { ApiScopeName } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { prisma } from '../../../../../adapters/prisma/client'
import { defaultEmailWhitelistSelection } from '../../../../../adapters/prisma/selection'
import app from '../../../../../app'
import { config } from '../../../../../config'
import logger from '../../../../../logger'
import { recoverApiToken } from '../../authentication/__tests__/fixtures/authentication.fixtures'
import { randomApiScopeName } from './fixtures/email-whitelist.fixture'

describe('Given a NGC integrations API user', () => {
  const agent = supertest(app)
  const url = `/integrations-api/v1/email-whitelists`

  afterEach(async () => {
    await prisma.integrationWhitelist.deleteMany()
    await Promise.all([
      prisma.verificationCode.deleteMany(),
      prisma.integrationApiScope.deleteMany(),
    ])
  })

  describe('When creating an Email Whitelist', () => {
    describe('And not authenticated', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent.post(url).expect(StatusCodes.UNAUTHORIZED)
      })
    })

    describe('And invalid token', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .post(url)
          .set('authorization', `Bearer invalid token`)
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })

    describe('And expired token', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        const token = jwt.sign(
          { email: faker.internet.email(), scopes: [ApiScopeName.ngc] },
          config.security.jwt.secret,
          {
            expiresIn: -1,
          }
        )

        await agent
          .post(url)
          .set('authorization', `Bearer ${token}`)
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })

    describe.each(
      Object.values(ApiScopeName)
        .filter((scopeName) => scopeName != ApiScopeName.ngc)
        .map((scope) => ({ scope }))
    )(`And valid $scope token`, ({ scope }) => {
      let token: string

      beforeEach(async () => {
        ;({ token } = await recoverApiToken({
          apiScope: { name: scope },
          prisma,
          agent,
        }))
      })

      describe.each(
        Object.values(ApiScopeName)
          .filter((scopeName) => scopeName != scope)
          .map((forbiddenScope) => ({ forbiddenScope }))
      )('And forbidden $forbiddenScope scope', ({ forbiddenScope }) => {
        test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
          await agent
            .post(url)
            .send({
              emailPattern: faker.internet.email(),
              description: faker.lorem.sentence(),
              scope: forbiddenScope,
            })
            .set('authorization', `Bearer ${token}`)
            .expect(StatusCodes.FORBIDDEN)
        })
      })

      test(`Then it return a ${StatusCodes.CREATED} response with the email whitelist`, async () => {
        const payload = {
          emailPattern: faker.internet.email().toLocaleLowerCase(),
          description: faker.lorem.sentence(),
          scope,
        }

        const { body } = await agent
          .post(url)
          .set('authorization', `Bearer ${token}`)
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(body).toEqual({
          ...payload,
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      })
    })

    describe(`And valid ${ApiScopeName.ngc} token`, () => {
      let token: string

      beforeEach(async () => {
        ;({ token } = await recoverApiToken({
          prisma,
          agent,
        }))
      })

      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .send({
              emailPattern: 'Je ne donne jamais mon email',
              description: faker.lorem.sentence(),
              scope: randomApiScopeName(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid scope', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .send({
              emailPattern: faker.internet.email(),
              description: faker.lorem.sentence(),
              scope: 'MySuperScope',
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And missing description', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .send({
              emailPattern: faker.internet.email(),
              scope: randomApiScopeName(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And scope does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .send({
              emailPattern: faker.internet.email(),
              description: faker.lorem.sentence(),
              scope: randomApiScopeName(
                Object.values(ApiScopeName).filter(
                  (scopeName) => scopeName != ApiScopeName.ngc
                )
              ),
            })
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And scope does exist', () => {
        let scope: ApiScopeName

        beforeEach(async () => {
          scope = randomApiScopeName()
          await prisma.integrationApiScope.upsert({
            where: {
              name: scope,
            },
            create: {
              name: scope,
              description: faker.lorem.sentence(),
            },
            update: {
              description: faker.lorem.sentence(),
            },
            select: {
              name: true,
            },
          })
        })

        test(`Then it return a ${StatusCodes.CREATED} response with the email whitelist`, async () => {
          const payload = {
            emailPattern: faker.internet.email().toLocaleLowerCase(),
            description: faker.lorem.sentence(),
            scope,
          }

          const { body } = await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(body).toEqual({
            ...payload,
            id: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

        test(`Then it stores an email whitelist in database`, async () => {
          const payload = {
            emailPattern: faker.internet.email().toLocaleLowerCase(),
            description: faker.lorem.sentence(),
            scope,
          }

          const {
            body: { id },
          } = await agent
            .post(url)
            .set('authorization', `Bearer ${token}`)
            .send(payload)
            .expect(StatusCodes.CREATED)

          const createdWhitelist = await prisma.integrationWhitelist.findUnique(
            {
              where: {
                id,
              },
              select: defaultEmailWhitelistSelection,
            }
          )

          const { scope: expectedScope, ...expectedPayload } = payload

          expect(createdWhitelist).toEqual({
            id,
            ...expectedPayload,
            apiScopeName: expectedScope,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          })
        })

        describe('And database failure', () => {
          const databaseError = new Error('Something went wrong')

          beforeEach(() => {
            jest
              .spyOn(prisma, '$transaction')
              .mockRejectedValueOnce(databaseError)
          })

          afterEach(() => {
            jest.spyOn(prisma, '$transaction').mockRestore()
          })

          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
            await agent
              .post(url)
              .set('authorization', `Bearer ${token}`)
              .send({
                emailPattern: faker.internet.email(),
                description: faker.lorem.sentence(),
                scope: ApiScopeName.agir,
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)
          })

          test(`Then it logs the exception`, async () => {
            await agent
              .post(url)
              .set('authorization', `Bearer ${token}`)
              .send({
                emailPattern: faker.internet.email(),
                description: faker.lorem.sentence(),
                scope: ApiScopeName.agir,
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            expect(logger.error).toHaveBeenCalledWith(
              'Email Whitelist creation failed',
              databaseError
            )
          })
        })
      })
    })
  })
})
