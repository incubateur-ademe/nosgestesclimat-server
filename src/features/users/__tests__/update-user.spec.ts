import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { formatBrevoDate } from '../../../adapters/brevo/__tests__/fixtures/formatBrevoDate'
import { ListIds } from '../../../adapters/brevo/constant'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBusError } from '../../../core/event-bus/error'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { createSimulation } from '../../simulations/__tests__/fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/users/v1/:userId'

  afterEach(() => prisma.user.deleteMany())

  describe('When updating his/her user', () => {
    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.alpha(34)))
          .send({
            email: faker.internet.email(),
            contact: {
              listIds: [],
            },
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid email', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({
            email: 'Je ne donne jamais mon email',
            contact: {
              listIds: [],
            },
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid newsletters', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({
            email: faker.internet.email(),
            contact: {
              listIds: [-1],
            },
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And user does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({
            email: faker.internet.email(),
            contact: {
              listIds: [],
            },
          })
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And user does exist', () => {
      let userId: string

      describe('And has no email', () => {
        beforeEach(async () => {
          ;({
            user: { id: userId },
          } = await createSimulation({
            agent,
          }))
        })

        test(`Then it sets the name and returns a ${StatusCodes.OK} response with the user`, async () => {
          const name = faker.person.fullName()

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              name,
            })
            .expect(StatusCodes.OK)

          const user = await prisma.user.findUniqueOrThrow({
            where: {
              id: userId,
            },
            select: {
              name: true,
            },
          })

          expect(body).toEqual({
            id: userId,
            name,
            email: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
          expect(user.name).toBe(name)
        })

        test(`Then it sets the email and returns a ${StatusCodes.OK} response with the user`, async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const name = faker.person.fullName()
          const contactId = faker.number.int()

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post(`/v3/contacts`, {
              email,
              attributes: {
                USER_ID: userId,
                PRENOM: name,
              },
              updateEnabled: true,
            })
            .reply(200, '')
            .get(`/v3/contacts/${encodeURIComponent(email)}`)
            .reply(200, {
              email,
              id: contactId,
              emailBlacklisted: faker.datatype.boolean(),
              smsBlacklisted: faker.datatype.boolean(),
              createdAt: formatBrevoDate(faker.date.past()),
              modifiedAt: formatBrevoDate(faker.date.recent()),
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              listIds: [],
              statistics: {},
            })

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              name,
              email,
            })
            .expect(StatusCodes.OK)

          const user = await prisma.user.findUniqueOrThrow({
            where: {
              id: userId,
            },
            select: {
              email: true,
            },
          })

          await EventBus.flush()

          expect(body).toEqual({
            contact: {
              id: contactId,
              email,
              listIds: [],
            },
            id: userId,
            name,
            email,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
          expect(user.email).toBe(email)
          expect(scope.isDone()).toBeTruthy()
        })

        describe('And database failure', () => {
          const databaseError = new Error('Something went wrong')

          beforeEach(() => {
            vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(
              databaseError
            )
          })

          afterEach(() => {
            vi.spyOn(prisma, '$transaction').mockRestore()
          })

          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
            await agent
              .put(url.replace(':userId', faker.string.uuid()))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)
          })

          test(`Then it logs the exception`, async () => {
            await agent
              .put(url.replace(':userId', faker.string.uuid()))
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            expect(logger.error).toHaveBeenCalledWith(
              'User update failed',
              databaseError
            )
          })
        })
      })

      describe('And has an email', () => {
        let email: string
        let contactId: number
        let listIds: number[]

        beforeEach(async () => {
          ;({
            user: { id: userId, email },
          } = await createSimulation({
            agent,
            simulation: {
              user: {
                email: faker.internet.email(),
              },
            },
          }))

          contactId = faker.number.int()
          listIds = [ListIds.MAIN_NEWSLETTER]
        })

        test(`Then it returns a ${StatusCodes.OK} response with the user`, async () => {
          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post(`/v3/contacts`, {
              email,
              listIds,
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              updateEnabled: true,
            })
            .reply(200, '')
            .get(`/v3/contacts/${encodeURIComponent(email)}`)
            .times(2)
            .reply(200, {
              email,
              id: contactId,
              emailBlacklisted: faker.datatype.boolean(),
              smsBlacklisted: faker.datatype.boolean(),
              createdAt: formatBrevoDate(faker.date.past()),
              modifiedAt: formatBrevoDate(faker.date.recent()),
              attributes: {
                USER_ID: userId,
                PRENOM: null,
              },
              listIds,
              statistics: {},
            })

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              email,
              contact: {
                listIds,
              },
            })
            .expect(StatusCodes.OK)

          await EventBus.flush()

          expect(body).toEqual({
            contact: {
              id: contactId,
              email,
              listIds,
            },
            id: userId,
            email,
            name: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
          expect(scope.isDone()).toBeTruthy()
        })

        describe('And already has newsLetters', () => {
          test(`Then it unsubscribes unwanted newsletters and it returns a ${StatusCodes.OK} response with the user`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .reply(200, '')
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(200, {
                email,
                id: contactId,
                emailBlacklisted: faker.datatype.boolean(),
                smsBlacklisted: faker.datatype.boolean(),
                createdAt: formatBrevoDate(faker.date.past()),
                modifiedAt: formatBrevoDate(faker.date.recent()),
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                listIds: [...listIds, ListIds.TRANSPORT_NEWSLETTER],
                statistics: {},
              })
              .post(
                `/v3/contacts/lists/${ListIds.TRANSPORT_NEWSLETTER}/contacts/remove`
              )
              .reply(200)
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(200, {
                email,
                id: contactId,
                emailBlacklisted: faker.datatype.boolean(),
                smsBlacklisted: faker.datatype.boolean(),
                createdAt: formatBrevoDate(faker.date.past()),
                modifiedAt: formatBrevoDate(faker.date.recent()),
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                listIds,
                statistics: {},
              })

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                contact: {
                  listIds,
                },
              })
              .expect(StatusCodes.OK)

            await EventBus.flush()

            expect(body).toEqual({
              contact: {
                id: contactId,
                email,
                listIds,
              },
              id: userId,
              email,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And network error', () => {
          test(`Then it returns a ${StatusCodes.NOT_FOUND} response and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .replyWithError({
                message: 'Network error occurred',
                code: 'ERR_CONNECTION_REFUSED',
              })

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                contact: {
                  listIds,
                },
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User update failed',
              expect.any(EventBusError)
            )
          })
        })

        describe('And brevo is down', () => {
          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response after retries and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .reply(500)
              .post(`/v3/contacts`)
              .reply(500)
              .post(`/v3/contacts`)
              .reply(500)
              .post(`/v3/contacts`)
              .reply(500)

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                contact: {
                  listIds,
                },
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User update failed',
              expect.any(EventBusError)
            )
          })
        })

        describe('And brevo interface changes', () => {
          test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} response and logs the exception`, async () => {
            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post(`/v3/contacts`)
              .reply(200, '')
              .get(`/v3/contacts/${encodeURIComponent(email)}`)
              .reply(200)

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email,
                contact: {
                  listIds,
                },
              })
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)

            await EventBus.flush()

            expect(body).toEqual({})
            expect(scope.isDone()).toBeTruthy()
            expect(logger.error).toHaveBeenCalledWith(
              'User update failed',
              expect.any(EventBusError)
            )
          })
        })
      })
    })
  })
})
