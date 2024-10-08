import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import app from '../../../app'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/authentication/v1/logout'

  describe('When logging out', () => {
    test(`It should return a ${StatusCodes.OK} response with a cookie`, async () => {
      const response = await agent.post(url).expect(StatusCodes.OK)

      const [cookie] = response.headers['set-cookie']

      expect(cookie).toEqual(
        'ngcjwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
      )
    })
  })
})
