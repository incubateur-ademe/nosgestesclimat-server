import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  brevoGetContact,
  brevoRemoveFromList,
  brevoUpdateContact,
} from '../../../adapters/brevo/__tests__/fixtures/server.fixture.js'
import { ListIds } from '../../../adapters/brevo/constant.js'
import { prisma } from '../../../adapters/prisma/client.js'
import * as prismaTransactionAdapter from '../../../adapters/prisma/transaction.js'
import app from '../../../app.js'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture.js'
import logger from '../../../logger.js'
import {
  getBrevoContact,
  subscribeToNewsLetter,
} from './fixtures/users.fixture.js'

vi.mock('../../../adapters/prisma/transaction', async () => ({
  ...(await vi.importActual('../../../adapters/prisma/transaction')),
}))

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/users/v1/:userId/newsletter-confirmation'

  afterEach(() =>
    Promise.all([
      prisma.user.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  )

  describe('When clicking the confirmation email link', () => {
    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.alpha(34)))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: faker.internet.email(),
            origin: 'https://nosgestesclimat.fr',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid email', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: 'Je ne donne jamais mon email',
            origin: 'https://nosgestesclimat.fr',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid newsLetters', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: faker.internet.email(),
            origin: 'https://nosgestesclimat.fr',
            listIds: [-1],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid origin', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: faker.internet.email(),
            origin: 'invalid origin',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid base origin', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: faker.internet.email(),
            origin: 'https://nosgestesclimat.fr/not-root',
          })
          .expect(StatusCodes.BAD_REQUEST)
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

      test('Then it redirects to an error page', async () => {
        const response = await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: faker.internet.email().toLocaleLowerCase(),
            origin: 'https://nosgestesclimat.fr',
            listIds: [ListIds.MAIN_NEWSLETTER],
          })
          .expect(StatusCodes.MOVED_TEMPORARILY)

        expect(response.get('location')).toBe(
          'https://nosgestesclimat.fr/newsletter-confirmation?success=false&status=500'
        )
      })

      test('Then it logs the exception', async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .query({
            code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            email: faker.internet.email().toLocaleLowerCase(),
            origin: 'https://nosgestesclimat.fr',
            listIds: [ListIds.MAIN_NEWSLETTER],
          })
          .expect(StatusCodes.MOVED_TEMPORARILY)

        expect(logger.error).toHaveBeenCalledWith(
          'Newsletter confirmation failed',
          databaseError
        )
      })
    })
  })

  describe('With an ongoing newsletter subscription request', () => {
    let listIds: string[]
    let userId: string
    let email: string
    let code: string

    describe('And main newsletter', () => {
      beforeEach(async () => {
        ;({
          id: userId,
          listIds,
          email,
          code,
        } = await subscribeToNewsLetter({
          agent,
        }))
      })

      describe('When clicking the confirmation email link', () => {
        test('Then it redirects to a success page', async () => {
          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: {
                    code: 'document_not_found',
                    message: 'List ID does not exist',
                  },
                  status: StatusCodes.NOT_FOUND,
                },
              ],
            }),
            brevoUpdateContact({
              expectBody: {
                email,
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                updateEnabled: true,
                listIds: [ListIds.MAIN_NEWSLETTER],
              },
            })
          )

          const response = await agent
            .get(url.replace(':userId', userId))
            .query({
              code,
              email,
              listIds,
              origin: 'https://nosgestesclimat.fr',
            })
            .expect(StatusCodes.MOVED_TEMPORARILY)

          expect(response.get('location')).toBe(
            'https://nosgestesclimat.fr/newsletter-confirmation?success=true'
          )
        })

        describe('And custom user origin (preprod)', () => {
          test('Then it redirects to a success page', async () => {
            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  {
                    body: {
                      code: 'document_not_found',
                      message: 'List ID does not exist',
                    },
                    status: StatusCodes.NOT_FOUND,
                  },
                ],
              }),
              brevoUpdateContact({
                expectBody: {
                  email,
                  attributes: {
                    USER_ID: userId,
                    PRENOM: null,
                  },
                  updateEnabled: true,
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              })
            )

            const response = await agent
              .get(url.replace(':userId', userId))
              .query({
                code,
                email,
                listIds,
                origin: 'https://preprod.nosgestesclimat.fr',
              })
              .expect(StatusCodes.MOVED_TEMPORARILY)

            expect(response.get('location')).toBe(
              'https://preprod.nosgestesclimat.fr/newsletter-confirmation?success=true'
            )
          })
        })
      })
    })

    describe('And several newsletters', () => {
      beforeEach(async () => {
        ;({
          id: userId,
          listIds,
          email,
          code,
        } = await subscribeToNewsLetter({
          agent,
          user: {
            contact: {
              listIds: [
                ListIds.MAIN_NEWSLETTER,
                ListIds.LOGEMENT_NEWSLETTER,
                ListIds.TRANSPORT_NEWSLETTER,
              ],
            },
          },
        }))
      })

      describe('When clicking the confirmation email link', () => {
        test('Then it redirects to a success page', async () => {
          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: {
                    code: 'document_not_found',
                    message: 'List ID does not exist',
                  },
                  status: StatusCodes.NOT_FOUND,
                },
              ],
            }),
            brevoUpdateContact({
              expectBody: {
                email,
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                updateEnabled: true,
                listIds: [
                  ListIds.MAIN_NEWSLETTER,
                  ListIds.LOGEMENT_NEWSLETTER,
                  ListIds.TRANSPORT_NEWSLETTER,
                ],
              },
            })
          )

          const response = await agent
            .get(url.replace(':userId', userId))
            .query({
              code,
              email,
              'listIds[]': listIds,
              origin: 'https://nosgestesclimat.fr',
            })
            .expect(StatusCodes.MOVED_TEMPORARILY)

          expect(response.get('location')).toBe(
            'https://nosgestesclimat.fr/newsletter-confirmation?success=true'
          )
        })
      })
    })

    describe('And user already has a brevo contact with some subscribed news letters', () => {
      beforeEach(async () => {
        ;({
          id: userId,
          listIds,
          email,
          code,
        } = await subscribeToNewsLetter({
          agent,
          user: {
            contact: {
              listIds: [ListIds.LOGEMENT_NEWSLETTER],
            },
          },
        }))
      })

      describe('When clicking the confirmation email link', () => {
        test('Then it redirects to a success page', async () => {
          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: getBrevoContact({
                    email,
                    attributes: {
                      USER_ID: userId,
                    },
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  }),
                },
              ],
            }),
            brevoRemoveFromList(ListIds.MAIN_NEWSLETTER, {
              expectBody: {
                emails: [email],
              },
            }),
            brevoUpdateContact({
              expectBody: {
                email,
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                updateEnabled: true,
                listIds: expect.arrayContaining([ListIds.LOGEMENT_NEWSLETTER]),
              },
            })
          )

          const response = await agent
            .get(url.replace(':userId', userId))
            .query({
              code,
              email,
              listIds,
              origin: 'https://nosgestesclimat.fr',
            })
            .expect(StatusCodes.MOVED_TEMPORARILY)

          expect(response.get('location')).toBe(
            'https://nosgestesclimat.fr/newsletter-confirmation?success=true'
          )
        })
      })
    })
  })

  describe('With an expired newsletter subscription request', () => {
    let listIds: string[]
    let userId: string
    let email: string
    let code: string

    beforeEach(async () => {
      ;({
        id: userId,
        listIds,
        email,
        code,
      } = await subscribeToNewsLetter({
        agent,
        expirationDate: dayjs().subtract(1, 'second').toDate(),
      }))
    })

    describe('When clicking the confirmation email link', () => {
      test('Then it redirects to an error page', async () => {
        mswServer.use(
          brevoGetContact(email, {
            customResponses: [
              {
                body: {
                  code: 'document_not_found',
                  message: 'List ID does not exist',
                },
                status: StatusCodes.NOT_FOUND,
              },
            ],
          })
        )

        const response = await agent
          .get(url.replace(':userId', userId))
          .query({
            code,
            email,
            listIds,
            origin: 'https://nosgestesclimat.fr',
          })
          .expect(StatusCodes.MOVED_TEMPORARILY)

        expect(response.get('location')).toBe(
          'https://nosgestesclimat.fr/newsletter-confirmation?success=false&status=404'
        )
      })
    })
  })
})
