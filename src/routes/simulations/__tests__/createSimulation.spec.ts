import supertest from 'supertest'
import app from '../../../app'
import {
  Simulation,
  type LeanSimulationType,
} from '../../../schemas/SimulationSchema'
import type { ModelToDto } from '../../../types/types'
import {
  createSimulation,
  FETCH_SIMULATION_ROUTE,
} from './fixtures/simulation.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = FETCH_SIMULATION_ROUTE
  let simulationId: string

  describe('When he creates a simulation without computedResults', () => {
    beforeEach(async () => {
      ;({ simulationId } = await createSimulation({ agent }))
    })

    it('Then it should not store computedResults', async () => {
      const simulation = await Simulation.findOne(
        {
          id: simulationId,
        },
        { computedResults: true }
      )

      expect(simulation!.computedResults).toBeUndefined()
    })

    describe(`And he recovers it`, () => {
      it('Then it should evaluate and store computedResults', async () => {
        const { body: simulationDto } = await agent.post(url).send({
          simulationId,
        })

        const simulation = await Simulation.findOne(
          {
            id: simulationId,
          },
          { computedResults: true }
        )

        expect(simulation!.computedResults).not.toBeUndefined()
        expect(simulationDto).toEqual({
          __v: expect.any(Number),
          _id: expect.any(String),
          id: simulationId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          computedResults: {
            carbone: {
              bilan: expect.any(Number),
              categories: expect.any(Object),
            },
          },
          date: expect.any(String),
          foldedSteps: [],
          groups: [],
          polls: [],
          user: expect.any(String),
        })
      })
    })
  })

  describe('When he creates a simulation without carbone or eau metric in computedResults', () => {
    beforeEach(async () => {
      ;({ simulationId } = await createSimulation({
        agent,
        simulation: {
          computedResults: {
            bilan: 3,
          } as unknown as ModelToDto<LeanSimulationType['computedResults']>,
        },
      }))
    })

    it('Then it should store computedResults in carbone metric', async () => {
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
        computedResults: {
          carbone: {
            bilan: 3,
          },
        },
      })
    })
  })

  describe('When he creates a simulation with carbone and eau metric in computedResults', () => {
    beforeEach(async () => {
      ;({ simulationId } = await createSimulation({
        agent,
        simulation: {
          computedResults: {
            carbone: {
              bilan: 5,
            },
            eau: {
              bilan: 3,
            },
          },
        },
      }))
    })

    it('Then it should store computedResults untouched', async () => {
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
        computedResults: {
          carbone: {
            bilan: 5,
          },
          eau: {
            bilan: 3,
          },
        },
      })
    })
  })
})
