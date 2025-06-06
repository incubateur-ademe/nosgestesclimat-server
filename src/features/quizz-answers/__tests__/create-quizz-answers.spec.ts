import { faker } from '@faker-js/faker'
import { QuizzAnswerIsAnswerCorrect } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import type { QuizzAnswerCreateDto } from '../quizz-answers.validator'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/quizz-answers/v1/'

  afterEach(() => prisma.quizzAnswer.deleteMany())

  describe('When creating a quizz answer', () => {
    describe('And no data provided', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid simulationId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.alpha(34),
            answer: 'transport . voiture',
            isAnswerCorrect: QuizzAnswerIsAnswerCorrect.correct,
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And missing answer', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            isAnswerCorrect: QuizzAnswerIsAnswerCorrect.correct,
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid isAnswerCorrect', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            answer: 'transport . voiture',
            isAnswerCorrect: 'my-invalid-isAnswerCorrect',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    test(`Then it returns a ${StatusCodes.CREATED} response`, async () => {
      const payload = {
        simulationId: faker.string.uuid(),
        answer: 'transport . voiture',
        isAnswerCorrect: QuizzAnswerIsAnswerCorrect.correct,
      }

      const response = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        ...payload,
      })
    })

    test('Then it stores a quizz answer in database', async () => {
      const payload: QuizzAnswerCreateDto = {
        simulationId: faker.string.uuid(),
        answer: 'transport . voiture',
        isAnswerCorrect: QuizzAnswerIsAnswerCorrect.correct,
      }

      await agent.post(url).send(payload)

      const createdQuizzAnswer = await prisma.quizzAnswer.findFirst({
        where: {
          simulationId: payload.simulationId,
          answer: payload.answer,
        },
      })

      expect(createdQuizzAnswer).toEqual({
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        ...payload,
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
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            answer: 'transport . voiture',
            isAnswerCorrect: QuizzAnswerIsAnswerCorrect.correct,
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent.post(url).send({
          simulationId: faker.string.uuid(),
          answer: 'transport . voiture',
          isAnswerCorrect: QuizzAnswerIsAnswerCorrect.correct,
        })

        expect(logger.error).toHaveBeenCalledWith(
          'QuizzAnswer creation failed',
          databaseError
        )
      })
    })
  })
})
