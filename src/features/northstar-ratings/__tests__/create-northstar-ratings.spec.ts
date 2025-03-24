import { faker } from '@faker-js/faker'
import { NorthstarRatingType } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import type { NorthstarRatingCreateDto } from '../northstar-ratings.validator'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/northstar-ratings/v1'

  afterEach(() => prisma.northstarRating.deleteMany())

  describe('When creating a northstar rating', () => {
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
            value: 5,
            type: NorthstarRatingType.learned,
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid value', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            simulationId: faker.string.uuid(),
            value: 42,
            type: NorthstarRatingType.learned,
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid type', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
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

    test(`Then it returns a ${StatusCodes.CREATED} response`, async () => {
      const payload = {
        simulationId: faker.string.uuid(),
        value: 5,
        type: NorthstarRatingType.learned,
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

    test('Then it stores a northstar rating in database', async () => {
      const payload: NorthstarRatingCreateDto = {
        simulationId: faker.string.uuid(),
        value: 5,
        type: NorthstarRatingType.learned,
      }

      await agent.post(url).send(payload)

      const createdNorthstarRating = await prisma.northstarRating.findFirst({
        where: {
          simulationId: payload.simulationId,
        },
      })

      expect(createdNorthstarRating).toEqual({
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
            value: 5,
            type: NorthstarRatingType.learned,
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent.post(url).send({
          simulationId: faker.string.uuid(),
          value: 5,
          type: NorthstarRatingType.learned,
        })

        expect(logger.error).toHaveBeenCalledWith(
          'NorthstarRating creation failed',
          databaseError
        )
      })
    })
  })
})
