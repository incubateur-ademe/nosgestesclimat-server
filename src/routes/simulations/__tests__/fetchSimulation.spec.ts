import { faker } from '@faker-js/faker'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { Organisation } from '../../../schemas/OrganisationSchema'
import type { PollType } from '../../../schemas/PollSchema'
import { Poll } from '../../../schemas/PollSchema'
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

  describe('When he creates a simulation in a poll', () => {
    let organisationAdministrator: { name: string; email: string }
    let poll: PollType

    beforeEach(async () => {
      poll = await Poll.create({
        name: 'poll',
        slug: 'poll',
      })

      organisationAdministrator = {
        name: faker.person.fullName(),
        email: faker.internet.email().toLocaleLowerCase(),
      }

      await Organisation.create({
        name: 'organisation',
        slug: 'organisation',
        administrators: [organisationAdministrator],
        polls: [poll._id],
      })
      ;({ simulationId } = await createSimulation({
        agent,
        simulation: { polls: [poll.slug] },
      }))
    })

    afterEach(() => Promise.all([Organisation.deleteMany(), Poll.deleteMany()]))

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
        polls: [poll.slug],
        user: expect.any(String),
      })
    })
  })
})
