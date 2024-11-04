import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import {
  createSimulation,
  FETCH_USER_SIMULATIONS_ROUTE,
} from './fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_USER_SIMULATIONS_ROUTE

  afterEach(() => prisma.user.deleteMany())

  describe('When fetching his simulations', () => {
    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.alpha(34)))
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And no simulation exist', () => {
      test(`Then it returns a ${StatusCodes.OK} response with an empty list`, async () => {
        const response = await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .expect(StatusCodes.OK)

        expect(response.body).toEqual([])
      })
    })

    describe('And a simulation does exist', () => {
      let simulation: Awaited<ReturnType<typeof createSimulation>>
      let userId: string

      beforeEach(async () => {
        simulation = await createSimulation({ agent })
        ;({
          user: { id: userId },
        } = simulation)
      }, 5000)

      test(`Then it returns a ${StatusCodes.OK} response with a list containing the simulation`, async () => {
        const response = await agent
          .get(url.replace(':userId', userId))
          .expect(StatusCodes.OK)

        expect(response.body).toEqual([simulation])
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest
          .spyOn(prisma.simulation, 'findMany')
          .mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma.simulation, 'findMany').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent
          .get(url.replace(':userId', faker.string.uuid()))
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Simulations fetch failed',
          databaseError
        )
      })
    })
  })
})
