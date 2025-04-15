import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  brevoGetContact,
  brevoRemoveFromList,
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../adapters/brevo/__tests__/fixtures/server.fixture'
import type { BrevoContactDto } from '../../../adapters/brevo/client'
import { ListIds } from '../../../adapters/brevo/constant'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import * as authenticationService from '../../authentication/authentication.service'
import { createSimulation } from '../../simulations/__tests__/fixtures/simulations.fixtures'
import { getBrevoContact, UPDATE_USER_ROUTE } from './fixtures/users.fixture'

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

      test(`Then it logs the exception`, async () => {
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
    describe('When subscribing to newsletter', () => {
      let code: string
      let expirationDate: Date

      beforeEach(() => {
        code = faker.number.int({ min: 100000, max: 999999 }).toString()
        expirationDate = dayjs().add(1, 'hour').toDate()

        vi.mocked(
          authenticationService
        ).generateVerificationCodeAndExpiration.mockReturnValueOnce({
          code,
          expirationDate,
        })
      })

      afterEach(() => {
        vi.mocked(
          authenticationService
        ).generateVerificationCodeAndExpiration.mockRestore()
      })

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
                  NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&listIds=22`,
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
                      NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&listIds=22`,
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
                      NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&listIds=22`,
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
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&listIds=22`,
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
            })

            describe('And new email provided', () => {
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
                        NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&listIds=22`,
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

              describe('And name', () => {
                test(`Then it sends an email and returns a ${StatusCodes.ACCEPTED} response but stores the name`, async () => {
                  const email = faker.internet.email().toLocaleLowerCase()
                  const name = faker.person.fullName()
                  const payload = {
                    name,
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
                      NEWSLETTER_CONFIRMATION_URL: `https://server.nosgestesclimat.fr/users/v1/${userId}/newsletter-confirmation?code=${code}&email=${encodeURIComponent(email)}&listIds=22`,
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
      let code: string
      let expirationDate: Date

      beforeEach(() => {
        code = faker.number.int({ min: 100000, max: 999999 }).toString()
        expirationDate = dayjs().add(1, 'hour').toDate()

        vi.mocked(
          authenticationService
        ).generateVerificationCodeAndExpiration.mockReturnValueOnce({
          code,
          expirationDate,
        })
      })

      afterEach(() => {
        vi.mocked(
          authenticationService
        ).generateVerificationCodeAndExpiration.mockRestore()
      })

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
              test(`Then it returns a ${StatusCodes.ACCEPTED} response`, async () => {
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

            test(`Then it returns a ${StatusCodes.ACCEPTED} response`, async () => {
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
  })
})
