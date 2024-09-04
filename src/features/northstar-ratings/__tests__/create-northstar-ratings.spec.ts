import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import {
  NorthstarRatingTypeEnum,
  type NorthstarRatingCreateDto,
} from '../northstar-ratings.validator'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/northstar-ratings'

  describe('When creating a northstar rating', () => {
    describe('And no data provided', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid simulationId', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.alpha(34),
            value: 5,
            type: NorthstarRatingTypeEnum.learned,
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid value', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            value: 42,
            type: NorthstarRatingTypeEnum.learned,
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid type', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            value: 5,
            type: 'my-invalid-type',
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    test(`It should return a ${StatusCodes.CREATED} response`, async () => {
      const payload = {
        simulationId: faker.string.uuid(),
        value: 5,
        type: NorthstarRatingTypeEnum.learned,
      }

      const response = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: null,
        ...payload,
      })
    })

    test('It should store a northstar rating in database', async () => {
      const payload: NorthstarRatingCreateDto = {
        simulationId: faker.string.uuid(),
        value: 5,
        type: NorthstarRatingTypeEnum.learned,
      }

      await agent.post(url).send(payload)

      const createdNorthstarRating = await prisma.northstarRating.findFirst({
        where: {
          simulationId: payload.simulationId,
        },
      })

      expect(createdNorthstarRating).toEqual({
        id: expect.any(String),
        createdAt: expect.anything(), // is not instance of Date due to jest
        updatedAt: null,
        ...payload,
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest
          .spyOn(prisma.northstarRating, 'upsert')
          .mockRejectedValueOnce(databaseError)
      })

      test(`Then it should return a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            value: 5,
            type: NorthstarRatingTypeEnum.learned,
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it should log the exception`, async () => {
        await agent.post(url).send({
          simulationId: faker.string.uuid(),
          value: 5,
          type: NorthstarRatingTypeEnum.learned,
        })

        expect(logger.error).toHaveBeenCalledWith(
          'NorthstarRating creation failed',
          databaseError
        )
      })
    })
  })
})
