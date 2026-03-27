import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '../../../adapters/prisma/client.js'
import app from '../../../app.js'
import {
  createSimulation,
  FETCH_USER_SIMULATIONS_ROUTE,
} from '../../simulations/__tests__/fixtures/simulations.fixtures.js'

describe('Given a NGC user', () => {
  const agent = supertest(app)

  afterEach(async () => {
    await Promise.all([
      prisma.user.deleteMany(),
      prisma.simulation.deleteMany(),
    ])
  })

  describe('When creating simulations on multiple devices without email', () => {
    let device1UserId: string
    let device2UserId: string
    let simulation1: Awaited<ReturnType<typeof createSimulation>>
    let simulation2: Awaited<ReturnType<typeof createSimulation>>

    beforeEach(async () => {
      device1UserId = faker.string.uuid()
      device2UserId = faker.string.uuid()

      // Create simulation on device 1
      simulation1 = await createSimulation({
        agent,
        userId: device1UserId,
        simulation: {},
      })

      // Create simulation on device 2
      simulation2 = await createSimulation({
        agent,
        userId: device2UserId,
        simulation: {},
      })
    })

    test('Then it keeps simulations separate without syncing', async () => {
      // Fetch simulations for device 1
      const response1 = await agent
        .get(FETCH_USER_SIMULATIONS_ROUTE.replace(':userId', device1UserId))
        .expect(StatusCodes.OK)

      expect(response1.body).toHaveLength(1)
      expect(response1.body[0].id).toBe(simulation1.id)

      // Fetch simulations for device 2
      const response2 = await agent
        .get(FETCH_USER_SIMULATIONS_ROUTE.replace(':userId', device2UserId))
        .expect(StatusCodes.OK)

      expect(response2.body).toHaveLength(1)
      expect(response2.body[0].id).toBe(simulation2.id)
    })
  })

  describe('When creating simulations on same device', () => {
    let userId: string
    let simulation1: Awaited<ReturnType<typeof createSimulation>>
    let simulation2: Awaited<ReturnType<typeof createSimulation>>

    beforeEach(async () => {
      userId = faker.string.uuid()

      // Create first simulation
      simulation1 = await createSimulation({
        agent,
        userId,
        simulation: {},
      })

      // Create second simulation
      simulation2 = await createSimulation({
        agent,
        userId,
        simulation: {},
      })
    })

    test('Then it creates both simulations with same userId', async () => {
      const response = await agent
        .get(FETCH_USER_SIMULATIONS_ROUTE.replace(':userId', userId))
        .expect(StatusCodes.OK)

      expect(response.body).toHaveLength(2)

      const simulationIds = response.body.map((s: { id: string }) => s.id)
      expect(simulationIds).toContain(simulation1.id)
      expect(simulationIds).toContain(simulation2.id)
    })
  })
})
