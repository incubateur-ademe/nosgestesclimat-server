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
  })
})
