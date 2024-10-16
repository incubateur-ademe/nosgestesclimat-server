import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { login } from '../../authentication/__tests__/fixtures/login.fixture'
import {
  createOrganisation,
  createOrganisationPoll,
} from '../../organisations/__tests__/fixtures/organisations.fixture'
import type { PollDefaultAdditionalQuestionTypeEnum } from '../../organisations/organisations.validator'
import type {
  SimulationAdditionalQuestionAnswerType,
  SimulationCreateInputDto,
} from '../simulations.validator'
import {
  CREATE_POLL_SIMULATION_ROUTE,
  getRandomTestCase,
} from './fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_POLL_SIMULATION_ROUTE
  const { computedResults, nom, situation } = getRandomTestCase()

  afterEach(() =>
    Promise.all([
      prisma.organisation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  )

  describe(`And ${nom} persona situation`, () => {
    describe('When creating a simulation in a poll ', () => {
      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
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
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.database.mongodbObjectId(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
                name: nom,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid situation', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.string.uuid(),
              situation: null,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
                name: nom,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid computedResults', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults: null,
              progression: 1,
              user: {
                id: faker.string.uuid(),
                name: nom,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And poll does not exist', () => {
        test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
              },
            })
            .expect(StatusCodes.NOT_FOUND)
        })
      })

      describe('And poll does exist', () => {
        let organisationId: string
        let organisationSlug: string
        let organisationName: string
        let pollId: string
        let pollSlug: string
        let poll: Awaited<ReturnType<typeof createOrganisationPoll>>

        beforeEach(async () => {
          const { cookie } = await login({ agent })
          ;({
            id: organisationId,
            name: organisationName,
            slug: organisationSlug,
          } = await createOrganisation({
            agent,
            cookie,
          }))
          poll = await createOrganisationPoll({
            agent,
            cookie,
            organisationId,
          })
          ;({ id: pollId, slug: pollSlug } = poll)
        })

        test(`Then it returns a ${StatusCodes.CREATED} response with the created simulation`, async () => {
          const payload: SimulationCreateInputDto = {
            id: faker.string.uuid(),
            situation,
            computedResults,
            progression: 1,
            user: {
              id: faker.string.uuid(),
            },
          }

          const response = await agent
            .post(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(response.body).toEqual({
            ...payload,
            date: expect.any(String),
            savedViaEmail: false,
            createdAt: expect.any(String),
            updatedAt: null,
            actionChoices: {},
            additionalQuestionsAnswers: [],
            foldedSteps: [],
            // prismock does not handle this correctly but covered in test below
            // polls: [
            //   {
            //     id: pollId,
            //   },
            // ],
            polls: [],
            user: {
              ...payload.user,
              email: null,
              name: null,
            },
          })
        })

        test('Then it stores a simulation in database', async () => {
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
            foldedSteps: ['myStep'],
            additionalQuestionsAnswers: [
              {
                type: 'custom' as SimulationAdditionalQuestionAnswerType.custom,
                key: 'myKey',
                answer: 'myAnswer',
              },
              {
                type: 'default' as SimulationAdditionalQuestionAnswerType.default,
                key: 'postalCode' as PollDefaultAdditionalQuestionTypeEnum.postalCode,
                answer: '00001',
              },
            ],
            user: {
              id: faker.string.uuid(),
              name: nom,
              email: faker.internet.email().toLocaleLowerCase(),
            },
          }

          nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

          const {
            body: { id },
          } = await agent
            .post(
              url
                .replace(':organisationIdOrSlug', organisationId)
                .replace(':pollIdOrSlug', pollId)
            )
            .send(payload)

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
                  poll: {
                    select: {
                      slug: true,
                    },
                  },
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
            // dates are not instance of Date due to jest
            createdAt: expect.anything(),
            date: expect.anything(),
            updatedAt: null,
            polls: [
              {
                pollId,
                poll: {
                  slug: pollSlug,
                },
              },
            ],
          })
        })

        describe('And using organisation and poll slugs', () => {
          test(`Then it returns a ${StatusCodes.CREATED} response with the created simulation`, async () => {
            const payload: SimulationCreateInputDto = {
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
              },
            }

            const response = await agent
              .post(
                url
                  .replace(':organisationIdOrSlug', organisationSlug)
                  .replace(':pollIdOrSlug', pollSlug)
              )
              .send(payload)
              .expect(StatusCodes.CREATED)

            expect(response.body).toEqual({
              ...payload,
              date: expect.any(String),
              savedViaEmail: false,
              createdAt: expect.any(String),
              updatedAt: null,
              actionChoices: {},
              additionalQuestionsAnswers: [],
              foldedSteps: [],
              // prismock does not handle this correctly but covered in test above
              // polls: [
              //   {
              //     id: pollId,
              //   },
              // ],
              polls: [],
              user: {
                ...payload.user,
                email: null,
                name: null,
              },
            })
          })
        })

        describe('And leaving his/her email', () => {
          test('Then it sends a creation email', async () => {
            const email = faker.internet.email().toLocaleLowerCase()
            const payload: SimulationCreateInputDto = {
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
                email,
              },
            }

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
                templateId: 71,
                params: {
                  ORGANISATION_NAME: organisationName,
                  DETAILED_VIEW_URL: `https://nosgestesclimat.fr/organisations/${organisationSlug}/resultats-detailles?mtm_campaign=email-automatise&mtm_kwd=orga-invite-campagne`,
                },
              })
              .reply(200)

            await agent
              .post(
                url
                  .replace(':organisationIdOrSlug', organisationId)
                  .replace(':pollIdOrSlug', pollId)
              )
              .send(payload)
              .expect(StatusCodes.CREATED)

            expect(scope.isDone()).toBeTruthy()
          })

          describe(`And incomplete simulation`, () => {
            test('Then it sends a continuation email', async () => {
              const email = faker.internet.email().toLocaleLowerCase()
              const payload: SimulationCreateInputDto = {
                id: faker.string.uuid(),
                situation,
                computedResults,
                progression: 0.5,
                user: {
                  id: faker.string.uuid(),
                  email,
                },
              }

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
                  templateId: 102,
                  params: {
                    SIMULATION_URL: `https://nosgestesclimat.fr/simulateur/bilan?sid=${payload.id}&mtm_campaign=email-automatise&mtm_kwd=pause-test-en-cours`,
                  },
                })
                .reply(200)

              await agent
                .post(
                  url
                    .replace(':organisationIdOrSlug', organisationId)
                    .replace(':pollIdOrSlug', pollId)
                )
                .send(payload)
                .expect(StatusCodes.CREATED)

              expect(scope.isDone()).toBeTruthy()
            })
          })

          describe('And custom user origin (preprod)', () => {
            test('Then it sends a creation email', async () => {
              const email = faker.internet.email().toLocaleLowerCase()
              const payload: SimulationCreateInputDto = {
                id: faker.string.uuid(),
                situation,
                computedResults,
                progression: 1,
                user: {
                  id: faker.string.uuid(),
                  email,
                },
              }

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
                  templateId: 71,
                  params: {
                    ORGANISATION_NAME: organisationName,
                    DETAILED_VIEW_URL: `https://preprod.nosgestesclimat.fr/organisations/${organisationSlug}/resultats-detailles?mtm_campaign=email-automatise&mtm_kwd=orga-invite-campagne`,
                  },
                })
                .reply(200)

              await agent
                .post(
                  url
                    .replace(':organisationIdOrSlug', organisationId)
                    .replace(':pollIdOrSlug', pollId)
                )
                .set('origin', 'https://preprod.nosgestesclimat.fr')
                .send(payload)
                .expect(StatusCodes.CREATED)

              expect(scope.isDone()).toBeTruthy()
            })
          })
        })
      })

      describe('And database failure', () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          jest
            .spyOn(prisma.poll, 'findFirstOrThrow')
            .mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          jest.spyOn(prisma.poll, 'findFirstOrThrow').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
              },
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent
            .post(
              url
                .replace(
                  ':organisationIdOrSlug',
                  faker.database.mongodbObjectId()
                )
                .replace(':pollIdOrSlug', faker.database.mongodbObjectId())
            )
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.string.uuid(),
              },
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Poll simulation creation failed',
            databaseError
          )
        })
      })
    })
  })
})
