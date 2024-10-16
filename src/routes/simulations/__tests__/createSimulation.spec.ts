import mongoose from 'mongoose'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { Simulation } from '../../../schemas/SimulationSchema'
import {
  createSimulation,
  FETCH_SIMULATION_ROUTE,
} from './fixtures/simulation.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_SIMULATION_ROUTE
  let simulationId: string

  afterEach(() => prisma.user.deleteMany())

  describe('When he creates a simulation', () => {
    beforeEach(async () => {
      ;({ simulationId } = await createSimulation({ agent }))
    })

    it('Then it stores a simulation in mongo', async () => {
      const simulation = await Simulation.findOne({
        id: simulationId,
      }).lean()

      expect(simulation).toEqual({
        __v: expect.any(Number),
        _id: expect.any(mongoose.Types.ObjectId),
        actionChoices: {},
        createdAt: expect.any(Date),
        customAdditionalQuestionsAnswers: {},
        date: expect.any(Date),
        defaultAdditionalQuestionsAnswers: {},
        foldedSteps: [],
        groups: [],
        id: simulationId,
        polls: [],
        situation: {},
        updatedAt: expect.any(Date),
        user: expect.any(mongoose.Types.ObjectId),
      })
    })

    it('Then it stores a simulation in postgres', async () => {
      const simulation = await prisma.simulation.findUnique({
        where: {
          id: simulationId,
        },
      })

      // dates are not instance of Date due to jest
      expect(simulation).toEqual({
        actionChoices: {},
        computedResults: null,
        createdAt: expect.anything(),
        date: expect.anything(),
        foldedSteps: [],
        id: simulationId,
        progression: null,
        savedViaEmail: false,
        situation: {},
        updatedAt: null,
        userEmail: null,
        userId: expect.any(String),
      })
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
