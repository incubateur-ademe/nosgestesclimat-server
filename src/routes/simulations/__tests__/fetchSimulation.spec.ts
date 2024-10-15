import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import {
  createSimulation,
  FETCH_SIMULATION_ROUTE,
} from './fixtures/simulation.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_SIMULATION_ROUTE
  let simulationId: string

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(async () => {
    await prisma.user.deleteMany()
    jest.restoreAllMocks()
  })

  describe('When he creates a simulation', () => {
    beforeEach(async () => {
      ;({ simulationId } = await createSimulation({ agent }))
    })

    it('Then he is able to get it again', async () => {
      const { body: simulation } = await agent.post(url).send({
        simulationId,
      })

      expect(simulation).toEqual({
        __v: expect.any(Number),
        _id: expect.any(String),
        id: simulationId,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        date: expect.any(String),
        foldedSteps: [],
        groups: [],
        polls: [],
        user: expect.any(String),
      })
    })
  })
})
