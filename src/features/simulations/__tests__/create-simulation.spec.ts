import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import type { PollDefaultAdditionalQuestionTypeEnum } from '../../organisations/organisations.validator'
import type {
  SimulationAdditionalQuestionAnswerType,
  SimulationCreateInputDto,
} from '../simulations.validator'
import {
  CREATE_SIMULATION_ROUTE,
  getRandomTestCase,
} from './fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_SIMULATION_ROUTE
  const { computedResults, nom, situation } = getRandomTestCase()

  afterEach(() => prisma.user.deleteMany())

  describe(`And ${nom} persona situation`, () => {
    describe('When creating his simulation', () => {
      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent.post(url).expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user id', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
            .send({
              id: faker.string.uuid(),
              situation,
              computedResults,
              progression: 1,
              user: {
                id: faker.database.mongodbObjectId(),
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url)
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
            .post(url)
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
            .post(url)
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
            .post(url)
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
          .post(url)
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

        const {
          body: { id },
        } = await agent.post(url).send(payload)

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
          // dates are not instance of Date due to jest
          createdAt: expect.anything(),
          date: expect.anything(),
          updatedAt: null,
          polls: [],
        })
      })

      describe(`And database failure`, () => {
        const databaseError = new Error('Something went wrong')

        beforeEach(() => {
          jest.spyOn(prisma.user, 'upsert').mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          jest.spyOn(prisma.user, 'upsert').mockRestore()
        })

        test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
          await agent
            .post(url)
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
          await agent.post(url).send({
            id: faker.string.uuid(),
            situation,
            computedResults,
            progression: 1,
            user: {
              id: faker.string.uuid(),
            },
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
