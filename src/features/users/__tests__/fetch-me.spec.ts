import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../../../app.js'
import { login } from '../../authentication/__tests__/fixtures/login.fixture.js'
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

  describe('And logged in', () => {
    let cookie: string
    let user: { userId: string; email: string }

    beforeEach(async () => {
      ;({ cookie, ...user } = await login({ agent }))
    })

    it(`Then it should return ${StatusCodes.OK} with the user data`, async () => {
      const response = await agent
        .get(url)
        .set('Cookie', cookie)
        .expect(StatusCodes.OK)

      expect(response.body).toEqual({
        id: user.userId,
        email: user.email,
      })
    })
  })
})
