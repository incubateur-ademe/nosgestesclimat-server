import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { describe, test } from 'vitest'
import app from '../../../app'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/integrations/v1/:externalService'

  describe('When requesting if partner is valid', () => {
    describe('And invalid external service parameter', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.get(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And agir external service', () => {
      const serviceName = 'agir'

      test(`Then it returns a ${StatusCodes.OK} response`, async () => {
        await agent
          .get(url.replace(':externalService', serviceName))
          .expect(StatusCodes.OK)
      })
    })

    describe('And 2 tonnes external service', () => {
      const serviceName = '2-tonnes'

      test(`Then it returns a ${StatusCodes.OK} response`, async () => {
        await agent
          .get(url.replace(':externalService', serviceName))
          .expect(StatusCodes.OK)
      })
    })
  })
})
