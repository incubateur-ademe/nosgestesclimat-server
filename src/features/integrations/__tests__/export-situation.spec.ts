import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { ZodError } from 'zod'
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
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid external Service', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).send(situation).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And agir external service', () => {
      const serviceName = 'agir'

      test(`Then it returns a ${StatusCodes.OK} with a redirectionUrl`, async () => {
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

      test(`Then it sends situation on agir service`, async () => {
        const scope = nock(process.env.AGIR_URL!, {
          reqheaders: {
            apikey: process.env.AGIR_API_KEY!,
          },
        })
          .post(`/bilan/importFromNGC`, { situation })
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
        test(`Then it retries several times and then raises the exception`, async () => {
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

        test(`Then it logs the exception`, async () => {
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

    describe('And 2 tonnes external service', () => {
      const serviceName = '2-tonnes'

      describe('And invalid external Service queryParams', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':externalService', serviceName))
            .query({
              queryParamNotStartingWithPartnerDash: true,
            })
            .send(situation)
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      test(`Then it returns a ${StatusCodes.OK} with a redirectionUrl`, async () => {
        nock(process.env.TWO_TONS_URL!)
          .post('/api/v1/ngc-carbon-form-answers')
          .reply(200, {
            redirect_url: 'http://app.2-tonnes.com',
          })

        const response = await agent
          .post(url.replace(':externalService', serviceName))
          .send(situation)
          .expect(StatusCodes.OK)

        expect(response.body).toEqual({
          redirectUrl: 'http://app.2-tonnes.com',
        })
      })

      test(`Then it sends situation on 2 tonnes service`, async () => {
        const scope = nock(process.env.TWO_TONS_URL!, {
          reqheaders: {
            Authorization: `Bearer ${process.env.TWO_TONS_BEARER_TOKEN}`,
          },
        })
          .post(`/api/v1/ngc-carbon-form-answers`, { situation })
          .reply(200, {
            redirect_url: 'http://app.2-tonnes.com',
          })

        await agent
          .post(url.replace(':externalService', serviceName))
          .send(situation)
          .expect(StatusCodes.OK)

        expect(scope.isDone()).toBeTruthy()
      })

      describe('And valid external Service queryParams', () => {
        test(`Then it sends situation on 2 tonnes service`, async () => {
          const scope = nock(process.env.TWO_TONS_URL!, {
            reqheaders: {
              Authorization: `Bearer ${process.env.TWO_TONS_BEARER_TOKEN}`,
            },
          })
            .post(
              `/api/v1/ngc-carbon-form-answers?partner-token=token&partner-boolean=true&partner-id=42&partner-object=${JSON.stringify({ foo: 'bar' })}`,
              { situation }
            )
            .reply(200, {
              redirect_url: 'http://app.2-tonnes.com',
            })

          await agent
            .post(url.replace(':externalService', serviceName))
            .query({
              'partner-token': 'token',
              'partner-boolean': true,
              'partner-id': 42,
              'partner-object': JSON.stringify({ foo: 'bar' }),
            })
            .send(situation)
            .expect(StatusCodes.OK)

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And 2 tonnes returns handled error', () => {
        test(`Then it returns a ${StatusCodes.OK} with a redirectionUrl`, async () => {
          nock(process.env.TWO_TONS_URL!)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(401, {
              redirect_url: 'http://app.2-tonnes.com/error',
            })

          const response = await agent
            .post(url.replace(':externalService', serviceName))
            .send(situation)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual({
            redirectUrl: 'http://app.2-tonnes.com/error',
          })
        })

        describe(`And 2 tonnes interface changes`, () => {
          test(`Then it raises the exception`, async () => {
            nock(process.env.TWO_TONS_URL!)
              .post('/api/v1/ngc-carbon-form-answers')
              .reply(400, {
                foo: 'bar',
              })

            await agent
              .post(url.replace(':externalService', serviceName))
              .send(situation)
              .expect(StatusCodes.INTERNAL_SERVER_ERROR)
          })

          test(`Then it logs the exception`, async () => {
            nock(process.env.TWO_TONS_URL!)
              .post('/api/v1/ngc-carbon-form-answers')
              .reply(400, {
                foo: 'bar',
              })

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

      describe(`And 2 tonnes interface changes`, () => {
        test(`Then it raises the exception`, async () => {
          nock(process.env.TWO_TONS_URL!)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(200, {
              foo: 'bar',
            })

          await agent
            .post(url.replace(':externalService', serviceName))
            .send(situation)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          nock(process.env.TWO_TONS_URL!)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(200, {
              foo: 'bar',
            })

          await agent
            .post(url.replace(':externalService', serviceName))
            .send(situation)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)

          expect(logger.error).toHaveBeenCalledWith(
            'Situation export failed',
            expect.any(ZodError)
          )
        })
      })

      describe(`And service is down`, () => {
        test(`Then it retries several times and then raises the exception`, async () => {
          nock(process.env.TWO_TONS_URL!)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)

          await agent
            .post(url.replace(':externalService', serviceName))
            .send(situation)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          nock(process.env.TWO_TONS_URL!)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)
            .post('/api/v1/ngc-carbon-form-answers')
            .reply(500)
            .post('/api/v1/ngc-carbon-form-answers')
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
