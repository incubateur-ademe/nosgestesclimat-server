import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import app from '../../../app'
import logger from '../../../logger'
import { getRandomPersonaSituation } from '../../simulations/__tests__/fixtures/simulations.fixtures'
import type { SituationSchema } from '../../simulations/simulations.validator'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = '/integrations/v1/:externalService/export-situation'

  describe('When exporting his simulation situation', () => {
    let situation: SituationSchema

    beforeEach(() => (situation = getRandomPersonaSituation()))

    describe('And no data provided', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid external Service', () => {
      test(`Then it should return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).send(situation).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And agir external service', () => {
      const serviceName = 'agir'

      test(`Then it should return a ${StatusCodes.OK} with a redirectionUrl`, async () => {
        nock(process.env.AGIR_URL!).post('/bilan/importFromNGC').reply(200, {
          redirect_url: 'http://app.agir.com',
        })

        const response = await agent
          .post(url.replace(':externalService', serviceName))
          .send(situation)
          .expect(StatusCodes.OK)

        expect(response.body).toEqual({
          redirectUrl: 'http://app.agir.com',
        })
      })

      it(`Then it should send situation on agir service`, async () => {
        const scope = nock(process.env.AGIR_URL!, {
          reqheaders: {
            apikey: process.env.AGIR_API_KEY!,
          },
        })
          .post(`/bilan/importFromNGC`, JSON.stringify({ situation }))
          .reply(200, {
            redirect_url: 'http://app.agir.com',
          })

        await agent
          .post(url.replace(':externalService', serviceName))
          .send(situation)
          .expect(StatusCodes.OK)

        expect(scope.isDone()).toBeTruthy()
      })

      describe(`And service is down`, () => {
        it(`Should retry several times and then raise the exception`, async () => {
          nock(process.env.AGIR_URL!)
            .post('/bilan/importFromNGC')
            .reply(500)
            .post('/bilan/importFromNGC')
            .reply(500)
            .post('/bilan/importFromNGC')
            .reply(500)
            .post('/bilan/importFromNGC')
            .reply(500)

          await agent
            .post(url.replace(':externalService', serviceName))
            .send(situation)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        it(`Should log the exception`, async () => {
          nock(process.env.AGIR_URL!)
            .post('/bilan/importFromNGC')
            .reply(500)
            .post('/bilan/importFromNGC')
            .reply(500)
            .post('/bilan/importFromNGC')
            .reply(500)
            .post('/bilan/importFromNGC')
            .reply(500)

          await agent
            .post(url.replace(':externalService', serviceName))
            .send(situation)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Situation export failed',
            expect.objectContaining({
              message: 'Request failed with status code 500',
              name: 'AxiosError',
              code: 'ERR_BAD_RESPONSE',
            })
          )
        })
      })
    })
  })
})
