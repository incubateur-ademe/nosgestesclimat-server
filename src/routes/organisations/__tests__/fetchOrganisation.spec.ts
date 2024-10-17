import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import app from '../../../app'
import { FETCH_ORGANISATION_ROUTE } from './fixtures/organisations.fixture'

describe(`Given a non authenticated ngc user`, () => {
  const request = supertest(app)
  const url = FETCH_ORGANISATION_ROUTE

  describe(`When listing organisations`, () => {
    it(`Should return an ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
      await request
        .post(url)
        .send({})
        .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        .expect(({ text }) => expect(text).toContain(`No token provided.`))
    })
  })
})
