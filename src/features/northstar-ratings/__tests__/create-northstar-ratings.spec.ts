import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import app from '../../../app'

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
            type: 'learned',
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
            type: 'learned',
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
          type: 'learned',
        })
        .expect(StatusCodes.CREATED)
    })
  })
})
