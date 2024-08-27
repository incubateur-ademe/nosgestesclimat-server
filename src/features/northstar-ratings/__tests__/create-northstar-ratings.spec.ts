import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import app from '../../../app'
import {
  NorthstarRatingEnum,
  type NorthstarRatingCreateDto,
} from '../northstar-ratings.validator'

const prisma = new PrismaClient()

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
            type: NorthstarRatingEnum.learned,
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
            type: NorthstarRatingEnum.learned,
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
      await agent
        .post(url)
        .send({
          simulationId: faker.string.uuid(),
          value: 5,
          type: NorthstarRatingEnum.learned,
        })
        .expect(StatusCodes.CREATED)
    })

    test('It should store a northstar rating in database', async () => {
      const payload: NorthstarRatingCreateDto = {
        simulationId: faker.string.uuid(),
        value: 5,
        type: NorthstarRatingEnum.learned,
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
  })
})
