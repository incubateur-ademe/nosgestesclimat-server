import { faker } from '@faker-js/faker'
import { version as modelVersion } from '@incubateur-ademe/nosgestesclimat/package.json'
import {
  PollDefaultAdditionalQuestionType,
  SimulationAdditionalQuestionAnswerType,
} from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  brevoRemoveFromList,
  brevoSendEmail,
  brevoUpdateContact,
} from '../../../adapters/brevo/__tests__/fixtures/server.fixture'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { mswServer } from '../../../core/__tests__/fixtures/server.fixture'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import type { SimulationCreateInputDto } from '../simulations.validator'
import {
  CREATE_SIMULATION_ROUTE,
  getRandomTestCase,
} from './fixtures/simulations.fixtures'

const defaultModelVersion = modelVersion.match(/^(\d+\.\d+\.\d+)/)!.pop()

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_SIMULATION_ROUTE
  const { computedResults, nom, situation } = getRandomTestCase()

  afterEach(() => prisma.user.deleteMany())

  describe(`And ${nom} persona situation`, () => {
    describe('When creating his simulation', () => {
      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.string.uuid()))
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user id', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.database.mongodbObjectId()))
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.string.uuid()))
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                name: nom,
                email: 'Je ne donne jamais mon email',
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid simulation id', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.string.uuid()))
            .send({
              id: faker.database.mongodbObjectId(),
              situation,
              computedResults,
              progression: 1,
              user: {
                name: nom,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid situation', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.string.uuid()))
            .send({
              id: faker.string.uuid(),
              situation: null,
              computedResults,
              progression: 1,
              user: {
                name: nom,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid computedResults', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.string.uuid()))
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults: null,
              progression: 1,
              user: {
                name: nom,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      test(`Then it returns a ${StatusCodes.CREATED} response with the created simulation`, async () => {
        const userId = faker.string.uuid()
        const payload: SimulationCreateInputDto = {
          id: faker.string.uuid(),
          model: `FR-fr-${defaultModelVersion}`,
          situation,
          computedResults,
          progression: 1,
        }

        const response = await agent
          .post(url.replace(':userId', userId))
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(response.body).toEqual({
          ...payload,
          date: expect.any(String),
          savedViaEmail: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          actionChoices: {},
          additionalQuestionsAnswers: [],
          foldedSteps: [],
          polls: [],
          user: {
            id: userId,
            email: null,
            name: null,
          },
        })
      })

      test('Then it stores a simulation in database', async () => {
        const userId = faker.string.uuid()
        const payload: SimulationCreateInputDto = {
          id: faker.string.uuid(),
          date: new Date(),
          situation,
          computedResults,
          progression: 1,
          actionChoices: {
            myAction: true,
          },
          savedViaEmail: true,
          // foldedSteps: ['myStep'], // Cannot do that with PG lite
          foldedSteps: [],
          additionalQuestionsAnswers: [
            {
              type: SimulationAdditionalQuestionAnswerType.custom,
              key: 'myKey',
              answer: 'myAnswer',
            },
            {
              type: SimulationAdditionalQuestionAnswerType.default,
              key: PollDefaultAdditionalQuestionType.postalCode,
              answer: '00001',
            },
          ],
          user: {
            name: nom,
            email: faker.internet.email().toLocaleLowerCase(),
          },
        }

        mswServer.use(
          brevoUpdateContact(),
          brevoRemoveFromList(22),
          brevoRemoveFromList(32),
          brevoRemoveFromList(36)
        )

        const {
          body: { id },
        } = await agent
          .post(url.replace(':userId', userId))
          .send(payload)
          .expect(StatusCodes.CREATED)

        await EventBus.flush()

        const createdSimulation = await prisma.simulation.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            date: true,
            situation: true,
            foldedSteps: true,
            progression: true,
            actionChoices: true,
            savedViaEmail: true,
            computedResults: true,
            additionalQuestionsAnswers: {
              select: {
                key: true,
                answer: true,
                type: true,
              },
            },
            polls: {
              select: {
                pollId: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdAt: true,
            updatedAt: true,
          },
        })

        expect(createdSimulation).toEqual({
          ...payload,
          createdAt: expect.any(Date),
          date: expect.any(Date),
          updatedAt: expect.any(Date),
          polls: [],
          user: {
            ...payload.user,
            id: userId,
          },
        })
      })

      describe('And updating it', () => {
        let userId: string
        let payload: SimulationCreateInputDto

        beforeEach(async () => {
          userId = faker.string.uuid()
          payload = {
            id: faker.string.uuid(),
            model: `FR-fr-${defaultModelVersion}`,
            situation,
            computedResults,
            progression: 1,
            additionalQuestionsAnswers: [
              {
                type: SimulationAdditionalQuestionAnswerType.default,
                key: PollDefaultAdditionalQuestionType.birthdate,
                answer: '1970-01-01',
              },
              {
                type: SimulationAdditionalQuestionAnswerType.default,
                key: PollDefaultAdditionalQuestionType.postalCode,
                answer: '00001',
              },
            ],
          }

          await agent
            .post(url.replace(':userId', userId))
            .send(payload)
            .expect(StatusCodes.CREATED)
        })

        test(`Then it returns ${StatusCodes.OK} response with updated simulation`, async () => {
          const response = await agent
            .post(url.replace(':userId', userId))
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(response.body).toEqual({
            ...payload,
            date: expect.any(String),
            savedViaEmail: false,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            actionChoices: {},
            foldedSteps: [],
            polls: [],
            user: {
              id: userId,
              email: null,
              name: null,
            },
          })
        })
      })
      describe('And leaving his/her email', () => {
        describe('And simulation finished', () => {
          test('Then it adds or updates contact in brevo', async () => {
            const date = new Date()
            const email = faker.internet.email().toLocaleLowerCase()
            const userId = faker.string.uuid()
            const payload: SimulationCreateInputDto = {
              id: faker.string.uuid(),
              date,
              situation,
              computedResults,
              progression: 1,
              savedViaEmail: true,
              user: {
                name: nom,
                email,
              },
            }

            mswServer.use(
              brevoUpdateContact({
                expectBody: {
                  email,
                  attributes: {
                    USER_ID: userId,
                    LAST_SIMULATION_DATE: date.toISOString(),
                    ACTIONS_SELECTED_NUMBER: 0,
                    LAST_SIMULATION_BILAN_FOOTPRINT: (
                      computedResults.carbone.bilan / 1000
                    ).toLocaleString('fr-FR', {
                      maximumFractionDigits: 1,
                    }),
                    LAST_SIMULATION_TRANSPORTS_FOOTPRINT: (
                      computedResults.carbone.categories.transport / 1000
                    ).toLocaleString('fr-FR', {
                      maximumFractionDigits: 1,
                    }),
                    LAST_SIMULATION_ALIMENTATION_FOOTPRINT: (
                      computedResults.carbone.categories.alimentation / 1000
                    ).toLocaleString('fr-FR', {
                      maximumFractionDigits: 1,
                    }),
                    LAST_SIMULATION_LOGEMENT_FOOTPRINT: (
                      computedResults.carbone.categories.logement / 1000
                    ).toLocaleString('fr-FR', {
                      maximumFractionDigits: 1,
                    }),
                    LAST_SIMULATION_DIVERS_FOOTPRINT: (
                      computedResults.carbone.categories.divers / 1000
                    ).toLocaleString('fr-FR', {
                      maximumFractionDigits: 1,
                    }),
                    LAST_SIMULATION_SERVICES_FOOTPRINT: (
                      computedResults.carbone.categories['services sociétaux'] /
                      1000
                    ).toLocaleString('fr-FR', {
                      maximumFractionDigits: 1,
                    }),
                    LAST_SIMULATION_BILAN_WATER: Math.round(
                      computedResults.eau.bilan / 365
                    ).toString(),
                    PRENOM: nom,
                  },
                  updateEnabled: true,
                },
              }),
              brevoRemoveFromList(22, {
                expectBody: { emails: [email] },
              }),
              brevoRemoveFromList(32, {
                expectBody: { emails: [email] },
              }),
              brevoRemoveFromList(36, {
                expectBody: { emails: [email] },
              })
            )

            await agent
              .post(url.replace(':userId', userId))
              .send(payload)
              .expect(StatusCodes.CREATED)

            await EventBus.flush()
          })

          test(`Then it sends a SIMULATION_COMPLETED email`, async () => {
            const id = faker.string.uuid()
            const email = faker.internet.email().toLocaleLowerCase()
            const payload: SimulationCreateInputDto = {
              id,
              situation,
              computedResults,
              progression: 1,
              user: {
                email,
              },
            }

            mswServer.use(
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: email,
                      email,
                    },
                  ],
                  templateId: 55,
                  params: {
                    SIMULATION_URL: `https://nosgestesclimat.fr/fin?sid=${id}&mtm_campaign=email-automatise&mtm_kwd=fin-retrouver-simulation`,
                  },
                },
              }),
              brevoUpdateContact(),
              brevoRemoveFromList(22),
              brevoRemoveFromList(32),
              brevoRemoveFromList(36)
            )

            await agent
              .post(url.replace(':userId', faker.string.uuid()))
              .send(payload)
              .query({ sendEmail: true })
              .expect(StatusCodes.CREATED)

            await EventBus.flush()
          })

          describe('And custom user origin (preprod)', () => {
            test(`Then it sends a SIMULATION_COMPLETED email`, async () => {
              const id = faker.string.uuid()
              const email = faker.internet.email().toLocaleLowerCase()
              const payload: SimulationCreateInputDto = {
                id,
                situation,
                computedResults,
                progression: 1,
                user: {
                  email,
                },
              }

              mswServer.use(
                brevoSendEmail({
                  expectBody: {
                    to: [
                      {
                        name: email,
                        email,
                      },
                    ],
                    templateId: 55,
                    params: {
                      SIMULATION_URL: `https://preprod.nosgestesclimat.fr/fin?sid=${id}&mtm_campaign=email-automatise&mtm_kwd=fin-retrouver-simulation`,
                    },
                  },
                }),
                brevoUpdateContact(),
                brevoRemoveFromList(22),
                brevoRemoveFromList(32),
                brevoRemoveFromList(36)
              )

              await agent
                .post(url.replace(':userId', faker.string.uuid()))
                .send(payload)
                .query({ sendEmail: true })
                .set('origin', 'https://preprod.nosgestesclimat.fr')
                .expect(StatusCodes.CREATED)

              await EventBus.flush()
            })
          })

          describe('And he subsribed to newsletters', () => {
            test('Then it adds or updates contact in brevo', async () => {
              const date = new Date()
              const email = faker.internet.email().toLocaleLowerCase()
              const userId = faker.string.uuid()
              const payload: SimulationCreateInputDto = {
                id: faker.string.uuid(),
                date,
                situation,
                computedResults,
                progression: 1,
                savedViaEmail: true,
                user: {
                  name: nom,
                  email,
                },
              }

              mswServer.use(
                brevoUpdateContact({
                  expectBody: {
                    email,
                    listIds: [22, 32, 36],
                    attributes: {
                      USER_ID: userId,
                      LAST_SIMULATION_DATE: date.toISOString(),
                      ACTIONS_SELECTED_NUMBER: 0,
                      LAST_SIMULATION_BILAN_FOOTPRINT: (
                        computedResults.carbone.bilan / 1000
                      ).toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      }),
                      LAST_SIMULATION_TRANSPORTS_FOOTPRINT: (
                        computedResults.carbone.categories.transport / 1000
                      ).toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      }),
                      LAST_SIMULATION_ALIMENTATION_FOOTPRINT: (
                        computedResults.carbone.categories.alimentation / 1000
                      ).toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      }),
                      LAST_SIMULATION_LOGEMENT_FOOTPRINT: (
                        computedResults.carbone.categories.logement / 1000
                      ).toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      }),
                      LAST_SIMULATION_DIVERS_FOOTPRINT: (
                        computedResults.carbone.categories.divers / 1000
                      ).toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      }),
                      LAST_SIMULATION_SERVICES_FOOTPRINT: (
                        computedResults.carbone.categories[
                          'services sociétaux'
                        ] / 1000
                      ).toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      }),
                      LAST_SIMULATION_BILAN_WATER: Math.round(
                        computedResults.eau.bilan / 365
                      ).toString(),
                      PRENOM: nom,
                    },
                    updateEnabled: true,
                  },
                })
              )

              await agent
                .post(url.replace(':userId', userId))
                .query({
                  'newsletters[]': [22, 32, 36],
                })
                .send(payload)
                .expect(StatusCodes.CREATED)

              await EventBus.flush()
            })
          })
        })

        describe('And simulation incomplete', () => {
          test(`Then it adds or updates contact in brevo`, async () => {
            const id = faker.string.uuid()
            const email = faker.internet.email().toLocaleLowerCase()
            const userId = faker.string.uuid()
            const payload: SimulationCreateInputDto = {
              id,
              situation,
              computedResults,
              progression: 0.5,
              user: {
                email,
              },
            }

            mswServer.use(
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

            await EventBus.flush()

            await agent
              .post(url.replace(':userId', userId))
              .send(payload)
              .expect(StatusCodes.CREATED)
          })

          test(`Then it sends a SIMULATION_IN_PROGRESS email`, async () => {
            const id = faker.string.uuid()
            const email = faker.internet.email().toLocaleLowerCase()
            const payload: SimulationCreateInputDto = {
              id,
              situation,
              computedResults,
              progression: 0.5,
              user: {
                email,
              },
            }

            mswServer.use(
              brevoSendEmail({
                expectBody: {
                  to: [
                    {
                      name: email,
                      email,
                    },
                  ],
                  templateId: 102,
                  params: {
                    SIMULATION_URL: `https://nosgestesclimat.fr/simulateur/bilan?sid=${id}&mtm_campaign=email-automatise&mtm_kwd=pause-test-en-cours`,
                  },
                },
              }),
              brevoUpdateContact()
            )

            await EventBus.flush()

            await agent
              .post(url.replace(':userId', faker.string.uuid()))
              .send(payload)
              .query({ sendEmail: true })
              .expect(StatusCodes.CREATED)
          })
        })
      })

      describe(`And database failure`, () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          vi.spyOn(prisma, '$transaction').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .post(url.replace(':userId', faker.string.uuid()))
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent.post(url.replace(':userId', faker.string.uuid())).send({
            id: faker.string.uuid(),
            situation,
            computedResults,
            progression: 1,
          })

          expect(logger.error).toHaveBeenCalledWith(
            'Simulation creation failed',
            databaseError
          )
        })
      })
    })
  })
})
