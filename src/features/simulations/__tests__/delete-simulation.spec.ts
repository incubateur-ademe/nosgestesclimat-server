import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import {
  afterEach,
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import { prisma } from '../../../adapters/prisma/client.js'
import * as prismaTransactionAdapter from '../../../adapters/prisma/transaction.js'
import app from '../../../app.js'
import logger from '../../../logger.js'
import { login } from '../../authentication/__tests__/fixtures/login.fixture.js'
import { DELETED_USER_ID } from '../simulation.constant.js'
import {
  createSimulation,
  DELETE_SIMULATION_ROUTE,
} from './fixtures/simulations.fixtures.js'

vi.mock('../../../adapters/prisma/transaction', async () => ({
  ...(await vi.importActual('../../../adapters/prisma/transaction')),
}))

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = DELETE_SIMULATION_ROUTE

  // Create the deleted user
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: DELETED_USER_ID },
      update: {},
      create: { id: DELETED_USER_ID },
    })
  })

  afterEach(async () => {
    await Promise.all([
      prisma.user.deleteMany({
        where: { id: { not: DELETED_USER_ID } },
      }),
      prisma.verificationCode.deleteMany(),
      prisma.verifiedUser.deleteMany(),
    ])
  })

  afterAll(async () => {
    await prisma.simulation.deleteMany({
      where: { userId: DELETED_USER_ID },
    })
  })

  describe('When deleting a simulation', () => {
    describe('And user is not authenticated', () => {
      test(`Then it returns a ${StatusCodes.UNAUTHORIZED} error`, async () => {
        await agent
          .delete(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', faker.string.uuid())
          )
          .expect(StatusCodes.UNAUTHORIZED)
      })
    })

    describe('And invalid userId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        const { cookie } = await login({ agent })

        await agent
          .delete(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', faker.string.alpha(34))
          )
          .set('cookie', cookie)
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid simulationId', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        const { cookie, userId } = await login({ agent })

        await agent
          .delete(
            url
              .replace(':simulationId', faker.string.alpha(34))
              .replace(':userId', userId)
          )
          .set('cookie', cookie)
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And simulation does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        const { cookie, userId } = await login({ agent })

        await agent
          .delete(
            url
              .replace(':simulationId', faker.string.uuid())
              .replace(':userId', userId)
          )
          .set('cookie', cookie)
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And simulation does exist and belongs to user', () => {
      let simulationId: string
      let userId: string
      let cookie: string

      beforeEach(async () => {
        const result = await login({ agent })
        cookie = result.cookie
        userId = result.userId
        const simulation = await createSimulation({ agent, cookie })
        simulationId = simulation.id
      })

      test(`Then it returns a ${StatusCodes.ACCEPTED} response`, async () => {
        await agent
          .delete(
            url
              .replace(':simulationId', simulationId)
              .replace(':userId', userId)
          )
          .set('cookie', cookie)
          .expect(StatusCodes.ACCEPTED)
      })

      test('Then the simulation is associated with the deleted user', async () => {
        await agent
          .delete(
            url
              .replace(':simulationId', simulationId)
              .replace(':userId', userId)
          )
          .set('cookie', cookie)
          .expect(StatusCodes.ACCEPTED)

        const simulation = await prisma.simulation.findUniqueOrThrow({
          where: { id: simulationId },
          select: { userId: true },
        })

        expect(simulation.userId).toBe(DELETED_USER_ID)
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      afterEach(() => {
        vi.spyOn(prismaTransactionAdapter, 'transaction').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        const { cookie } = await login({ agent })
        const simulation = await createSimulation({ agent, cookie })

        vi.spyOn(prismaTransactionAdapter, 'transaction').mockRejectedValueOnce(
          databaseError
        )

        await agent
          .delete(
            url
              .replace(':simulationId', simulation.id)
              .replace(':userId', simulation.user.id)
          )
          .set('cookie', cookie)
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test('Then it logs the exception', async () => {
        const { cookie } = await login({ agent })
        const simulation = await createSimulation({ agent, cookie })

        vi.spyOn(prismaTransactionAdapter, 'transaction').mockRejectedValueOnce(
          databaseError
        )

        await agent
          .delete(
            url
              .replace(':simulationId', simulation.id)
              .replace(':userId', simulation.user.id)
          )
          .set('cookie', cookie)
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Simulation deletion failed',
          databaseError
        )
      })
    })
  })
})
