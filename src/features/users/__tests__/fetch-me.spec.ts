import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { describe, it } from 'vitest'
import app from '../../../app.js'
import { ME_ROUTE } from './fixtures/users.fixture.js'

describe('Given a NGC User', () => {
  const agent = supertest(app)
  const url = ME_ROUTE

  describe('When requesting his user data', () => {
    describe('And logged out', () => {
      it(`Then it should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent.get(url).expect(StatusCodes.UNAUTHORIZED)
      })
    })
  })
})
