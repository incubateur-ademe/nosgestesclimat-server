import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  brevoDeleteContact,
  brevoGetContact,
  brevoRemoveFromList,
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../adapters/brevo/__tests__/fixtures/server.fixture.js'
import type { BrevoContactDto } from '../../../adapters/brevo/client.js'
import { ListIds } from '../../../adapters/brevo/constant.js'
import { prisma } from '../../../adapters/prisma/client.js'
import app from '../../../app.js'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture.js'
import logger from '../../../logger.js'
import { login } from '../../authentication/__tests__/fixtures/login.fixture.js'
import { createVerificationCode } from '../../authentication/__tests__/fixtures/verification-codes.fixture.js'
import * as authenticationService from '../../authentication/authentication.service.js'
import { createSimulation } from '../../simulations/__tests__/fixtures/simulations.fixtures.js'
import {
  createUser,
  getBrevoContact,
  UPDATE_USER_ROUTE,
} from './fixtures/users.fixture.js'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = UPDATE_USER_ROUTE

  afterEach(() =>
    Promise.all([
      prisma.user.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  )

  describe('When updating his/her profile', () => {
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

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        vi.spyOn(prisma, '$transaction').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({})
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test('Then it logs the exception', async () => {
        await agent
          .put(url.replace(':userId', faker.string.uuid()))
          .send({})
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'User update failed',
          databaseError
        )
      })
    })
  })

  describe('And logged out', () => {
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

    describe('When subscribing to newsletter', () => {
      describe('And user does not already exist', () => {
        test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()

          const payload = {
            email,
            contact: {
              listIds: [ListIds.MAIN_NEWSLETTER],
            },
          }

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
            brevoSendEmail({
              expectBody: {
                to: [
                  {
                    name: email,
                    email,
                  },
                ],
                templateId: 118,
                params: {
                  NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                },
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send(payload)
            .expect(StatusCodes.ACCEPTED)

          expect(body).toEqual({
            id: userId,
            email,
            name: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

        test('Then it stores a verification code valid 1 day in database', async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()

          const payload = {
            email,
            contact: {
              listIds: [ListIds.MAIN_NEWSLETTER],
            },
          }

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
            brevoSendEmail()
          )

          const now = Date.now()
          const oneDay = 1000 * 60 * 60 * 24

          await agent
            .put(url.replace(':userId', userId))
            .send(payload)
            .expect(StatusCodes.ACCEPTED)

          const [verificationCode] = await prisma.verificationCode.findMany()

          expect(verificationCode).toEqual({
            id: expect.any(String),
            code,
            userId,
            email,
            expirationDate: expect.any(Date),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          })

          // Hopefully code gets created under 1 second
          expect(
            Math.floor(
              (verificationCode.expirationDate.getTime() - now - oneDay) / 1000
            )
          ).toBe(0)
        })

        describe('And name', () => {
          test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response but stores the name`, async () => {
            const userId = faker.string.uuid()
            const email = faker.internet.email().toLocaleLowerCase()
            const name = faker.person.fullName()
            const payload = {
              email,
              name,
              contact: {
                listIds: [ListIds.MAIN_NEWSLETTER],
              },
            }

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
              brevoSendEmail()
            )

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send(payload)
              .expect(StatusCodes.ACCEPTED)

            expect(body).toEqual({
              id: userId,
              email,
              name,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })

        describe('And custom user origin (preprod)', () => {
          test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
            const email = faker.internet.email().toLocaleLowerCase()
            const userId = faker.string.uuid()

            const payload = {
              email,
              contact: {
                listIds: [ListIds.MAIN_NEWSLETTER],
              },
            }

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
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: email,
                      email,
                    },
                  ],
                  templateId: 118,
                  params: {
                    NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://preprod.nosgestesclimat.fr')}&listIds=22`,
                  },
                },
              })
            )

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .set('origin', 'https://preprod.nosgestesclimat.fr')
              .send(payload)
              .expect(StatusCodes.ACCEPTED)

            expect(body).toEqual({
              id: userId,
              email,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })

        describe('And no email provided', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
            const userId = faker.string.uuid()
            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              })
              .expect(StatusCodes.OK)

            expect(body).toEqual({
              id: userId,
              email: null,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })

          describe('And name', () => {
            test(`Then it returns a ${StatusCodes.OK} response with the updated user but stores the name`, async () => {
              const userId = faker.string.uuid()
              const name = faker.person.fullName()
              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send({
                  name,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                })
                .expect(StatusCodes.OK)

              expect(body).toEqual({
                id: userId,
                name,
                email: null,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })
          })
        })
      })

      describe('And user already exists', () => {
        let userId: string

        describe('And has no email', () => {
          beforeEach(async () => {
            ;({
              user: { id: userId },
            } = await createSimulation({
              agent,
            }))
          })

          describe('And has no brevo contact', () => {
            test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
              const email = faker.internet.email().toLocaleLowerCase()
              const payload = {
                email,
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              }

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
                brevoSendEmail({
                  expectBody: {
                    to: [
                      {
                        name: email,
                        email,
                      },
                    ],
                    templateId: 118,
                    params: {
                      NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                    },
                  },
                })
              )

              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.ACCEPTED)

              expect(body).toEqual({
                id: userId,
                email,
                name: null,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })

            test('Then it stores a verification code valid 1 day in database', async () => {
              const email = faker.internet.email().toLocaleLowerCase()
              const payload = {
                email,
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              }

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
                brevoSendEmail()
              )

              const now = Date.now()
              const oneDay = 1000 * 60 * 60 * 24

              await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.ACCEPTED)

              const [verificationCode] =
                await prisma.verificationCode.findMany()

              expect(verificationCode).toEqual({
                id: expect.any(String),
                code,
                userId,
                email,
                expirationDate: expect.any(Date),
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
              })

              // Hopefully code gets created under 1 second
              expect(
                Math.floor(
                  (verificationCode.expirationDate.getTime() - now - oneDay) /
                    1000
                )
              ).toBe(0)
            })

            describe('And name', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response but stores the name`, async () => {
                const email = faker.internet.email().toLocaleLowerCase()
                const name = faker.person.fullName()
                const payload = {
                  email,
                  name,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

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
                  brevoSendEmail()
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And custom user origin (preprod)', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const email = faker.internet.email().toLocaleLowerCase()
                const payload = {
                  email,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

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
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: email,
                          email,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://preprod.nosgestesclimat.fr')}&listIds=22`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .set('origin', 'https://preprod.nosgestesclimat.fr')
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And no email provided', () => {
              test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send({
                    contact: {
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                  })
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email: null,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })

              describe('And name', () => {
                test(`Then it returns a ${StatusCodes.OK} response with the updated user but stores the name`, async () => {
                  const name = faker.person.fullName()
                  const { body } = await agent
                    .put(url.replace(':userId', userId))
                    .send({
                      name,
                      contact: {
                        listIds: [ListIds.MAIN_NEWSLETTER],
                      },
                    })
                    .expect(StatusCodes.OK)

                  expect(body).toEqual({
                    id: userId,
                    name,
                    email: null,
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                  })
                })
              })
            })
          })

          describe('And has a brevo contact', () => {
            let email: string
            let contact: BrevoContactDto

            beforeEach(() => {
              email = faker.internet.email().toLocaleLowerCase()

              contact = getBrevoContact({
                email,
                attributes: {
                  USER_ID: userId,
                },
              })
            })

            test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
              const payload = {
                email,
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              }

              mswServer.use(
                brevoGetContact(email, {
                  customResponses: [
                    {
                      body: contact,
                    },
                  ],
                }),
                brevoSendEmail({
                  expectBody: {
                    to: [
                      {
                        name: email,
                        email,
                      },
                    ],
                    templateId: 118,
                    params: {
                      NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                    },
                  },
                })
              )

              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.ACCEPTED)

              expect(body).toEqual({
                id: userId,
                email,
                name: null,
                contact: {
                  id: contact.id,
                  email,
                  listIds: [],
                },
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })

            test('Then it stores a verification code valid 1 day in database', async () => {
              const payload = {
                email,
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              }

              mswServer.use(
                brevoGetContact(email, {
                  customResponses: [
                    {
                      body: contact,
                    },
                  ],
                }),
                brevoSendEmail()
              )

              const now = Date.now()
              const oneDay = 1000 * 60 * 60 * 24

              await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.ACCEPTED)

              const [verificationCode] =
                await prisma.verificationCode.findMany()

              expect(verificationCode).toEqual({
                id: expect.any(String),
                code,
                userId,
                email,
                expirationDate: expect.any(Date),
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
              })

              // Hopefully code gets created under 1 second
              expect(
                Math.floor(
                  (verificationCode.expirationDate.getTime() - now - oneDay) /
                    1000
                )
              ).toBe(0)
            })

            describe('And name', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response but stores the name`, async () => {
                const name = faker.person.fullName()
                const payload = {
                  email,
                  name,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  }),
                  brevoSendEmail()
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And custom user origin (preprod)', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const payload = {
                  email,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  }),
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: email,
                          email,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://preprod.nosgestesclimat.fr')}&listIds=22`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .set('origin', 'https://preprod.nosgestesclimat.fr')
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And contact has already subscribed an unknown newsletter', () => {
              beforeEach(() => {
                contact.listIds = [404]
              })

              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const payload = {
                  email,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  }),
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: email,
                          email,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://preprod.nosgestesclimat.fr')}&listIds=22&listIds=404`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .set('origin', 'https://preprod.nosgestesclimat.fr')
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [404],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And no email provided', () => {
              test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send({
                    contact: {
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                  })
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email: null,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })

              describe('And name', () => {
                test(`Then it returns a ${StatusCodes.OK} response with the updated user but stores the name`, async () => {
                  const name = faker.person.fullName()
                  const { body } = await agent
                    .put(url.replace(':userId', userId))
                    .send({
                      name,
                      contact: {
                        listIds: [ListIds.MAIN_NEWSLETTER],
                      },
                    })
                    .expect(StatusCodes.OK)

                  expect(body).toEqual({
                    id: userId,
                    name,
                    email: null,
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                  })
                })
              })
            })
          })
        })

        describe('And has an email', () => {
          let email: string

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
          })

          describe('And has no brevo contact', () => {
            describe('And no email provided', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

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
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: email,
                          email,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })

              test('Then it stores a verification code valid 1 day in database', async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

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
                  brevoSendEmail()
                )

                const now = Date.now()
                const oneDay = 1000 * 60 * 60 * 24

                await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                const [verificationCode] =
                  await prisma.verificationCode.findMany()

                expect(verificationCode).toEqual({
                  id: expect.any(String),
                  code,
                  userId,
                  email,
                  expirationDate: expect.any(Date),
                  createdAt: expect.any(Date),
                  updatedAt: expect.any(Date),
                })

                // Hopefully code gets created under 1 second
                expect(
                  Math.floor(
                    (verificationCode.expirationDate.getTime() - now - oneDay) /
                      1000
                  )
                ).toBe(0)
              })

              describe('And name', () => {
                test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response but stores the name`, async () => {
                  const name = faker.person.fullName()
                  const payload = {
                    name,
                    contact: {
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                  }

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
                    brevoSendEmail()
                  )

                  const { body } = await agent
                    .put(url.replace(':userId', userId))
                    .send(payload)
                    .expect(StatusCodes.ACCEPTED)

                  expect(body).toEqual({
                    id: userId,
                    email,
                    name,
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                  })
                })
              })

              describe('And custom user origin (preprod)', () => {
                test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                  const payload = {
                    contact: {
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                  }

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
                    brevoSendEmail({
                      expectBody: {
                        to: [
                          {
                            name: email,
                            email,
                          },
                        ],
                        templateId: 118,
                        params: {
                          NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://preprod.nosgestesclimat.fr')}&listIds=22`,
                        },
                      },
                    })
                  )

                  const { body } = await agent
                    .put(url.replace(':userId', userId))
                    .set('origin', 'https://preprod.nosgestesclimat.fr')
                    .send(payload)
                    .expect(StatusCodes.ACCEPTED)

                  expect(body).toEqual({
                    id: userId,
                    email,
                    name: null,
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                  })
                })
              })
            })

            describe('And new email provided', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const newEmail = faker.internet.email().toLocaleLowerCase()
                const payload = {
                  email: newEmail,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: getBrevoContact({
                          email,
                          attributes: {
                            USER_ID: userId,
                          },
                        }),
                      },
                    ],
                  }),
                  brevoGetContact(newEmail, {
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
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: newEmail,
                          email: newEmail,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(newEmail)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  contact: {
                    email,
                    id: expect.any(Number),
                    listIds: [],
                  },
                  id: userId,
                  email,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })

              test('Then it stores a verification code valid 1 day in database', async () => {
                const newEmail = faker.internet.email().toLocaleLowerCase()
                const payload = {
                  email: newEmail,
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: getBrevoContact({
                          email,
                          attributes: {
                            USER_ID: userId,
                          },
                        }),
                      },
                    ],
                  }),
                  brevoGetContact(newEmail, {
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
                  brevoSendEmail()
                )

                const now = Date.now()
                const oneDay = 1000 * 60 * 60 * 24

                await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                const [verificationCode] =
                  await prisma.verificationCode.findMany()

                expect(verificationCode).toEqual({
                  id: expect.any(String),
                  code,
                  userId,
                  email: newEmail,
                  expirationDate: expect.any(Date),
                  createdAt: expect.any(Date),
                  updatedAt: expect.any(Date),
                })

                // Hopefully code gets created under 1 second
                expect(
                  Math.floor(
                    (verificationCode.expirationDate.getTime() - now - oneDay) /
                      1000
                  )
                ).toBe(0)
              })

              describe('And name', () => {
                test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response but stores the name`, async () => {
                  const newEmail = faker.internet.email().toLocaleLowerCase()
                  const name = faker.person.fullName()
                  const payload = {
                    name,
                    email: newEmail,
                    contact: {
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                  }

                  mswServer.use(
                    brevoGetContact(email, {
                      customResponses: [
                        {
                          body: getBrevoContact({
                            email,
                            attributes: {
                              USER_ID: userId,
                            },
                          }),
                        },
                      ],
                    }),
                    brevoGetContact(newEmail, {
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
                    brevoSendEmail()
                  )

                  const { body } = await agent
                    .put(url.replace(':userId', userId))
                    .send(payload)
                    .expect(StatusCodes.ACCEPTED)

                  expect(body).toEqual({
                    contact: {
                      email,
                      id: expect.any(Number),
                      listIds: [],
                    },
                    id: userId,
                    email,
                    name,
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                  })
                })
              })
            })
          })

          describe('And has a brevo contact', () => {
            let contact: BrevoContactDto

            beforeEach(() => {
              contact = getBrevoContact({
                email,
                attributes: {
                  USER_ID: userId,
                },
              })
            })

            test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
              const payload = {
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              }

              mswServer.use(
                brevoGetContact(email, {
                  customResponses: [
                    {
                      body: contact,
                    },
                  ],
                }),
                brevoSendEmail({
                  expectBody: {
                    to: [
                      {
                        name: email,
                        email,
                      },
                    ],
                    templateId: 118,
                    params: {
                      NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                    },
                  },
                })
              )

              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.ACCEPTED)

              expect(body).toEqual({
                id: userId,
                email,
                name: null,
                contact: {
                  id: contact.id,
                  email,
                  listIds: [],
                },
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })

            describe('And custom user origin (preprod)', () => {
              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  }),
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: email,
                          email,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://preprod.nosgestesclimat.fr')}&listIds=22`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .set('origin', 'https://preprod.nosgestesclimat.fr')
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And contact has already subscribed an unknown newsletter', () => {
              beforeEach(() => {
                contact.listIds = [404]
              })

              test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  }),
                  brevoSendEmail({
                    expectBody: {
                      to: [
                        {
                          name: email,
                          email,
                        },
                      ],
                      templateId: 118,
                      params: {
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22&listIds=404`,
                      },
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.ACCEPTED)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [404],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And contact has already subscribed to the newsletter', () => {
              beforeEach(() => {
                contact.listIds = [ListIds.MAIN_NEWSLETTER]
              })

              test(`Then it returns a ${StatusCodes.OK} response`, async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                      {
                        body: contact,
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

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })

              describe('And name', () => {
                test(`Then it returns a ${StatusCodes.OK} response`, async () => {
                  const name = faker.person.fullName()
                  const payload = {
                    name,
                    contact: {
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                  }

                  mswServer.use(
                    brevoGetContact(email, {
                      customResponses: [
                        {
                          body: contact,
                        },
                        {
                          body: contact,
                        },
                      ],
                    }),
                    brevoUpdateContact({
                      expectBody: {
                        email,
                        attributes: {
                          USER_ID: userId,
                          PRENOM: name,
                        },
                        updateEnabled: true,
                        listIds: [ListIds.MAIN_NEWSLETTER],
                      },
                    })
                  )

                  const { body } = await agent
                    .put(url.replace(':userId', userId))
                    .send(payload)
                    .expect(StatusCodes.OK)

                  expect(body).toEqual({
                    id: userId,
                    email,
                    name,
                    contact: {
                      id: contact.id,
                      email,
                      listIds: [ListIds.MAIN_NEWSLETTER],
                    },
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                  })
                })
              })
            })

            describe('And contact has already subscribed to more newsletters', () => {
              beforeEach(() => {
                contact.listIds = [
                  ListIds.MAIN_NEWSLETTER,
                  ListIds.TRANSPORT_NEWSLETTER,
                ]
              })

              test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  })
                )

                await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.FORBIDDEN)
              })
            })

            describe('And contact has already subscribed to technical newsletters', () => {
              beforeEach(() => {
                contact.listIds = [
                  ListIds.MAIN_NEWSLETTER,
                  ListIds.GROUP_CREATED,
                  ListIds.GROUP_JOINED,
                ]
              })

              test(`Then it returns a ${StatusCodes.OK} response and not unsubscribe technical newsletter`, async () => {
                const payload = {
                  contact: {
                    listIds: [ListIds.MAIN_NEWSLETTER],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                      {
                        body: contact,
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
                        ListIds.GROUP_CREATED,
                        ListIds.GROUP_JOINED,
                      ],
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: contact.id,
                    email,
                    listIds: [
                      ListIds.MAIN_NEWSLETTER,
                      ListIds.GROUP_CREATED,
                      ListIds.GROUP_JOINED,
                    ],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })
          })
        })
      })
    })

    describe('When unsubscribing from newsletters', () => {
      describe('And user does not already exist', () => {
        test(`Then it returns a ${StatusCodes.OK} response`, async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()

          const payload = {
            email,
            contact: {
              listIds: [],
            },
          }

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
                {
                  body: getBrevoContact({
                    email,
                    attributes: {
                      USER_ID: userId,
                    },
                  }),
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
                listIds: [],
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send(payload)
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            id: userId,
            email,
            name: null,
            contact: {
              id: expect.any(Number),
              email,
              listIds: [],
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

        describe('And no email provided', () => {
          test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
            const userId = faker.string.uuid()
            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                contact: {
                  listIds: [],
                },
              })
              .expect(StatusCodes.OK)

            expect(body).toEqual({
              id: userId,
              email: null,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })
      })

      describe('And user already exists', () => {
        let userId: string

        describe('And has no email', () => {
          beforeEach(async () => {
            ;({
              user: { id: userId },
            } = await createSimulation({
              agent,
            }))
          })

          describe('And has no brevo contact', () => {
            test(`Then it returns a ${StatusCodes.OK} response`, async () => {
              const email = faker.internet.email().toLocaleLowerCase()
              const payload = {
                email,
                contact: {
                  listIds: [],
                },
              }

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
                    {
                      body: getBrevoContact({
                        email,
                        attributes: {
                          USER_ID: userId,
                        },
                      }),
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
                    listIds: [],
                  },
                })
              )

              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.OK)

              expect(body).toEqual({
                id: userId,
                email,
                name: null,
                contact: {
                  id: expect.any(Number),
                  email,
                  listIds: [],
                },
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })

            describe('And no email provided', () => {
              test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send({
                    contact: {
                      listIds: [],
                    },
                  })
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email: null,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })
          })

          describe('And has a brevo contact', () => {
            let email: string
            let contact: BrevoContactDto

            beforeEach(() => {
              email = faker.internet.email().toLocaleLowerCase()

              contact = getBrevoContact({
                email,
                attributes: {
                  USER_ID: userId,
                },
              })
            })

            test(`Then it returns a ${StatusCodes.OK} response`, async () => {
              const payload = {
                email,
                contact: {
                  listIds: [],
                },
              }

              mswServer.use(
                brevoGetContact(email, {
                  customResponses: [
                    {
                      body: contact,
                    },
                    {
                      body: contact,
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
                    listIds: [],
                  },
                })
              )

              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.OK)

              expect(body).toEqual({
                id: userId,
                email,
                name: null,
                contact: {
                  id: contact.id,
                  email,
                  listIds: [],
                },
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })

            describe('And no email provided', () => {
              test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send({
                    contact: {
                      listIds: [],
                    },
                  })
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email: null,
                  name: null,
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })
          })
        })

        describe('And has an email', () => {
          let email: string

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
          })

          describe('And has no brevo contact', () => {
            describe('And no email provided', () => {
              test(`Then it returns a ${StatusCodes.OK} response`, async () => {
                const payload = {
                  contact: {
                    listIds: [],
                  },
                }

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
                      {
                        body: getBrevoContact({
                          email,
                          attributes: {
                            USER_ID: userId,
                          },
                        }),
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
                      listIds: [],
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email,
                  name: null,
                  contact: {
                    id: expect.any(Number),
                    email,
                    listIds: [],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })

            describe('And new email provided', () => {
              test(`Then it returns a ${StatusCodes.OK} response`, async () => {
                const newEmail = faker.internet.email().toLocaleLowerCase()
                const payload = {
                  email: newEmail,
                  contact: {
                    listIds: [],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: getBrevoContact({
                          email,
                          attributes: {
                            USER_ID: userId,
                          },
                        }),
                      },
                    ],
                  }),
                  brevoDeleteContact(email),
                  brevoGetContact(newEmail, {
                    customResponses: [
                      {
                        body: {
                          code: 'document_not_found',
                          message: 'List ID does not exist',
                        },
                        status: StatusCodes.NOT_FOUND,
                      },
                      {
                        body: getBrevoContact({
                          email: newEmail,
                          attributes: {
                            USER_ID: userId,
                          },
                        }),
                      },
                    ],
                  }),
                  brevoUpdateContact({
                    expectBody: {
                      email: newEmail,
                      attributes: {
                        USER_ID: userId,
                        PRENOM: null,
                      },
                      updateEnabled: true,
                      listIds: [],
                    },
                  })
                )

                const { body } = await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.OK)

                expect(body).toEqual({
                  id: userId,
                  email: newEmail,
                  name: null,
                  contact: {
                    id: expect.any(Number),
                    email: newEmail,
                    listIds: [],
                  },
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String),
                })
              })
            })
          })

          describe('And has a brevo contact', () => {
            let contact: BrevoContactDto

            beforeEach(() => {
              contact = getBrevoContact({
                email,
                attributes: {
                  USER_ID: userId,
                },
              })
            })

            test(`Then it returns a ${StatusCodes.OK} response`, async () => {
              const payload = {
                contact: {
                  listIds: [],
                },
              }

              mswServer.use(
                brevoGetContact(email, {
                  customResponses: [
                    {
                      body: contact,
                    },
                    {
                      body: contact,
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
                    listIds: [],
                  },
                })
              )

              const { body } = await agent
                .put(url.replace(':userId', userId))
                .send(payload)
                .expect(StatusCodes.OK)

              expect(body).toEqual({
                id: userId,
                email,
                name: null,
                contact: {
                  id: contact.id,
                  email,
                  listIds: [],
                },
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            })

            describe('And contact has already subscribed to the newsletter', () => {
              beforeEach(() => {
                contact.listIds = [ListIds.MAIN_NEWSLETTER]
              })

              test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
                const payload = {
                  contact: {
                    listIds: [],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  })
                )

                await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.FORBIDDEN)
              })
            })

            describe('And contact has already subscribed to technical newsletters', () => {
              beforeEach(() => {
                contact.listIds = [
                  ListIds.MAIN_NEWSLETTER,
                  ListIds.GROUP_CREATED,
                  ListIds.GROUP_JOINED,
                ]
              })

              test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
                const payload = {
                  contact: {
                    listIds: [],
                  },
                }

                mswServer.use(
                  brevoGetContact(email, {
                    customResponses: [
                      {
                        body: contact,
                      },
                    ],
                  })
                )

                await agent
                  .put(url.replace(':userId', userId))
                  .send(payload)
                  .expect(StatusCodes.FORBIDDEN)
              })
            })
          })
        })
      })
    })

    describe('When updating his/her email', () => {
      let contact: BrevoContactDto | undefined
      let userId: string
      let email: string

      beforeEach(async () => {
        ;({
          user: { id: userId, email },
          contact,
        } = await createUser({
          agent,
          user: { email: faker.internet.email().toLocaleLowerCase() },
        }))
      })

      describe('And brevo contact does not exist for new email', () => {
        test(`Then it returns a ${StatusCodes.OK} response with the updated user`, async () => {
          const newEmail = faker.internet.email().toLocaleLowerCase()

          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: contact,
                },
              ],
            }),
            brevoDeleteContact(email),
            brevoGetContact(newEmail, {
              customResponses: [
                {
                  body: {
                    code: 'document_not_found',
                    message: 'List ID does not exist',
                  },
                  status: StatusCodes.NOT_FOUND,
                },
                {
                  body: {
                    ...contact,
                    email: newEmail,
                  },
                },
              ],
            }),
            brevoUpdateContact({
              expectBody: {
                email: newEmail,
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                updateEnabled: true,
                listIds: [],
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              email: newEmail,
            })
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            contact: {
              email: newEmail,
              id: contact?.id,
              listIds: [],
            },
            id: userId,
            email: newEmail,
            name: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

        describe('And subscribing to newsletters', () => {
          test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
            const newEmail = faker.internet.email().toLocaleLowerCase()

            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  {
                    body: contact,
                  },
                ],
              }),
              brevoGetContact(newEmail, {
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
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: newEmail,
                      email: newEmail,
                    },
                  ],
                  templateId: 118,
                  params: {
                    NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(newEmail)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                  },
                },
              })
            )

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email: newEmail,
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              })
              .expect(StatusCodes.ACCEPTED)

            expect(body).toEqual({
              contact: {
                id: contact?.id,
                listIds: contact?.listIds,
                email,
              },
              id: userId,
              email,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })

        describe('And previous contact had newsletter', () => {
          beforeEach(() => {
            contact!.listIds = [ListIds.MAIN_NEWSLETTER]
          })

          test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
            const newEmail = faker.internet.email().toLocaleLowerCase()

            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  {
                    body: contact,
                  },
                ],
              }),
              brevoGetContact(newEmail, {
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
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: newEmail,
                      email: newEmail,
                    },
                  ],
                  templateId: 118,
                  params: {
                    NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(newEmail)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                  },
                },
              })
            )

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email: newEmail,
              })
              .expect(StatusCodes.ACCEPTED)

            expect(body).toEqual({
              contact: {
                id: contact?.id,
                listIds: [ListIds.MAIN_NEWSLETTER],
                email,
              },
              id: userId,
              email,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })
      })

      describe('And brevo contact does exist for new email', () => {
        test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
          const newEmail = faker.internet.email().toLocaleLowerCase()

          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: contact,
                },
              ],
            }),
            brevoGetContact(newEmail, {
              customResponses: [
                {
                  body: getBrevoContact({
                    email: newEmail,
                    attributes: {
                      USER_ID: userId,
                    },
                  }),
                },
              ],
            }),
            brevoSendEmail({
              expectBody: {
                to: [
                  {
                    name: newEmail,
                    email: newEmail,
                  },
                ],
                templateId: 118,
                params: {
                  NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(newEmail)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}`,
                },
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .send({
              email: newEmail,
            })
            .expect(StatusCodes.ACCEPTED)

          expect(body).toEqual({
            contact: {
              email,
              id: contact?.id,
              listIds: [],
            },
            id: userId,
            email,
            name: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

        describe('And subscribing to newsletters', () => {
          test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
            const newEmail = faker.internet.email().toLocaleLowerCase()

            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  {
                    body: contact,
                  },
                ],
              }),
              brevoGetContact(newEmail, {
                customResponses: [
                  {
                    body: getBrevoContact({
                      email: newEmail,
                      attributes: {
                        USER_ID: userId,
                      },
                    }),
                  },
                ],
              }),
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: newEmail,
                      email: newEmail,
                    },
                  ],
                  templateId: 118,
                  params: {
                    NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(newEmail)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                  },
                },
              })
            )

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email: newEmail,
                contact: {
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
              })
              .expect(StatusCodes.ACCEPTED)

            expect(body).toEqual({
              contact: {
                email,
                id: contact?.id,
                listIds: [],
              },
              id: userId,
              email,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })

        describe('And previous contact had newsletter', () => {
          beforeEach(() => {
            contact!.listIds = [ListIds.MAIN_NEWSLETTER]
          })

          test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response`, async () => {
            const newEmail = faker.internet.email().toLocaleLowerCase()

            mswServer.use(
              brevoGetContact(email, {
                customResponses: [
                  {
                    body: contact,
                  },
                ],
              }),
              brevoGetContact(newEmail, {
                customResponses: [
                  {
                    body: getBrevoContact({
                      email: newEmail,
                      attributes: {
                        USER_ID: userId,
                      },
                    }),
                  },
                ],
              }),
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: newEmail,
                      email: newEmail,
                    },
                  ],
                  templateId: 118,
                  params: {
                    NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(newEmail)}&origin=${encodeURIComponent('https://nosgestesclimat.fr')}&listIds=22`,
                  },
                },
              })
            )

            const { body } = await agent
              .put(url.replace(':userId', userId))
              .send({
                email: newEmail,
              })
              .expect(StatusCodes.ACCEPTED)

            expect(body).toEqual({
              contact: {
                email,
                id: contact?.id,
                listIds: [ListIds.MAIN_NEWSLETTER],
              },
              id: userId,
              email,
              name: null,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          })
        })
      })
    })
  })

  describe('And logged in', () => {
    let email: string
    let userId: string
    let cookie: string
    let contact: BrevoContactDto

    beforeEach(async () => {
      ;({ cookie, email, userId } = await login({
        agent,
      }))

      contact = getBrevoContact({
        email,
        attributes: {
          USER_ID: userId,
        },
      })
    })

    describe('When subscribing to newsletter', () => {
      test(`Then it returns a ${StatusCodes.OK} response with updated contact`, async () => {
        const payload = {
          contact: {
            listIds: [ListIds.MAIN_NEWSLETTER],
          },
        }

        mswServer.use(
          brevoGetContact(email, {
            customResponses: [
              {
                body: contact,
              },
              {
                body: {
                  ...contact,
                  listIds: [ListIds.MAIN_NEWSLETTER],
                },
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

        const { body } = await agent
          .put(url.replace(':userId', userId))
          .set('cookie', cookie)
          .send(payload)
          .expect(StatusCodes.OK)

        expect(body).toEqual({
          id: userId,
          email,
          name: null,
          contact: {
            id: contact.id,
            email,
            listIds: [ListIds.MAIN_NEWSLETTER],
          },
          optedInForCommunications: false,
          position: null,
          telephone: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      })
    })

    describe('When unsubscribing from newsletter', () => {
      describe('And contact has no previous newsletter subscription', () => {
        test(`Then it returns a ${StatusCodes.OK} response with updated contact`, async () => {
          const payload = {
            contact: {
              listIds: [],
            },
          }

          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: contact,
                },
                {
                  body: contact,
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
                listIds: [],
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            id: userId,
            email,
            name: null,
            contact: {
              id: contact.id,
              email,
              listIds: [],
            },
            optedInForCommunications: false,
            position: null,
            telephone: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })
      })

      describe('And contact has previous newsletter subscriptions', () => {
        beforeEach(() => {
          contact.listIds = [
            ListIds.MAIN_NEWSLETTER,
            ListIds.TRANSPORT_NEWSLETTER,
          ]
        })

        test(`Then it returns a ${StatusCodes.OK} response with updated contact`, async () => {
          const payload = {
            contact: {
              listIds: [],
            },
          }

          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: contact,
                },
                {
                  body: {
                    ...contact,
                    listIds: [],
                  },
                },
              ],
            }),
            brevoRemoveFromList(ListIds.MAIN_NEWSLETTER, {
              expectBody: {
                emails: [email],
              },
            }),
            brevoRemoveFromList(ListIds.TRANSPORT_NEWSLETTER, {
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
                listIds: [],
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            id: userId,
            email,
            name: null,
            contact: {
              id: contact.id,
              email,
              listIds: [],
            },
            optedInForCommunications: false,
            position: null,
            telephone: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })
      })

      describe('And contact has previous technical newsletter subscriptions', () => {
        beforeEach(() => {
          contact.listIds = [
            ListIds.MAIN_NEWSLETTER,
            ListIds.TRANSPORT_NEWSLETTER,
            ListIds.ORGANISATIONS,
          ]
        })

        test(`Then it returns a ${StatusCodes.OK} response with updated contact`, async () => {
          const payload = {
            contact: {
              listIds: [],
            },
          }

          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: contact,
                },
                {
                  body: {
                    ...contact,
                    listIds: [ListIds.ORGANISATIONS],
                  },
                },
              ],
            }),
            brevoRemoveFromList(ListIds.MAIN_NEWSLETTER, {
              expectBody: {
                emails: [email],
              },
            }),
            brevoRemoveFromList(ListIds.TRANSPORT_NEWSLETTER, {
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
                listIds: [ListIds.ORGANISATIONS],
              },
            })
          )

          const { body } = await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.OK)

          expect(body).toEqual({
            id: userId,
            email,
            name: null,
            contact: {
              id: contact.id,
              email,
              listIds: [ListIds.ORGANISATIONS],
            },
            optedInForCommunications: false,
            position: null,
            telephone: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })
      })
    })

    describe('When updating his/her email', () => {
      describe('And no verification code provided', () => {
        test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
          const payload = {
            email: faker.internet.email(),
          }

          const response = await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .send(payload)
            .expect(StatusCodes.FORBIDDEN)

          expect(response.text).toEqual(
            'Forbidden ! Cannot update email without a verification code.'
          )
        })
      })

      describe('And invalid verification code', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          const payload = {
            email: faker.internet.email(),
          }

          await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .query({
              code: '42',
            })
            .send(payload)
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And verification code does not exist', () => {
        test(`Then it returns a ${StatusCodes.FORBIDDEN} error`, async () => {
          const payload = {
            email: faker.internet.email(),
          }

          const response = await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .query({
              code: faker.number.int({ min: 100000, max: 999999 }).toString(),
            })
            .send(payload)
            .expect(StatusCodes.FORBIDDEN)

          expect(response.text).toEqual(
            'Forbidden ! Invalid verification code.'
          )
        })
      })

      describe('And verification code does exist', () => {
        let newEmail: string
        let code: string

        beforeEach(async () => {
          newEmail = faker.internet.email().toLocaleLowerCase()
          ;({ code } = await createVerificationCode({
            agent,
            verificationCode: { userId, email: newEmail },
          }))
        })

        test(`Then it returns a ${StatusCodes.OK} response with the updated user and a new cookie`, async () => {
          const payload = {
            email: newEmail,
          }

          mswServer.use(
            brevoGetContact(email, {
              customResponses: [
                {
                  body: contact,
                },
              ],
            }),
            brevoGetContact(newEmail, {
              customResponses: [
                {
                  body: {
                    code: 'document_not_found',
                    message: 'List ID does not exist',
                  },
                  status: StatusCodes.NOT_FOUND,
                },
                {
                  body: {
                    ...contact,
                    email: newEmail,
                  },
                },
              ],
            }),
            brevoDeleteContact(email),
            brevoUpdateContact({
              expectBody: {
                email: newEmail,
                attributes: {
                  USER_ID: userId,
                  PRENOM: null,
                },
                updateEnabled: true,
                listIds: [],
              },
            })
          )

          const response = await agent
            .put(url.replace(':userId', userId))
            .set('cookie', cookie)
            .query({
              code,
            })
            .send(payload)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            contact: {
              id: contact.id,
              email: newEmail,
              listIds: contact.listIds,
            },
            createdAt: expect.any(String),
            email: newEmail,
            id: userId,
            name: null,
            optedInForCommunications: false,
            position: null,
            telephone: null,
            updatedAt: expect.any(String),
          })

          // Cookies are kept in supertest
          const [, newCookie] = response.headers['set-cookie']
          const token = newCookie.split(';').shift()?.replace('ngcjwt=', '')

          expect(jwt.decode(token!)).toEqual({
            userId,
            email: newEmail,
            exp: expect.any(Number),
            iat: expect.any(Number),
          })
        })
      })
    })
  })
})
