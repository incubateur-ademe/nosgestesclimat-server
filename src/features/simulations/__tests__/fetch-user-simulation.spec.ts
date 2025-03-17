import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import {
  createSimulation,
  FETCH_USER_SIMULATION_ROUTE,
} from './fixtures/simulations.fixtures'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_USER_SIMULATION_ROUTE

  afterEach(() => prisma.user.deleteMany())

  describe('When fetching one of his simulations', () => {
    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', faker.string.alpha(34))
          )
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid simulationId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .get(
            url
              .replace(':simulationId', faker.string.alpha(34))
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And simulation does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .get(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And simulation does exist', () => {
      let simulation: Awaited<ReturnType<typeof createSimulation>>
      let simualtionId: string
      let userId: string

      beforeEach(async () => {
        simulation = await createSimulation({ agent })
        ;({
          id: simualtionId,
          user: { id: userId },
        } = simulation)
      })

      test(`Then it returns a ${StatusCodes.OK} response with the simulation`, async () => {
        const response = await agent
          .get(
            url
              .replace(':simulationId', simualtionId)
              .replace(':userId', userId)
          )
          .expect(StatusCodes.OK)

        expect(response.body).toEqual(simulation)
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        vi.spyOn(prisma, '$transaction').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .get(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent
          .get(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Simulation fetch failed',
          databaseError
        )
      })
    })
  })
})
