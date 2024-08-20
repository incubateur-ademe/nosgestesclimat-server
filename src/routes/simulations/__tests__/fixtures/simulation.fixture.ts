import { faker } from '@faker-js/faker'
import nock from 'nock'
import type supertest from 'supertest'
import type { LeanSimulationType } from '../../../../schemas/SimulationSchema'
import type { ModelToDto } from '../../../../types/types'

type TestAgent = ReturnType<typeof supertest>

export const CREATE_SIMULATION_ROUTE = '/simulations/create'

export const FETCH_SIMULATION_ROUTE = '/simulations/fetch-simulation'

export const createSimulation = async ({
  agent,
  simulation = {},
}: {
  agent: TestAgent
  simulation?: Partial<ModelToDto<LeanSimulationType>>
}) => {
  const simulationId = faker.string.uuid()
  const email = faker.internet.email().toLocaleLowerCase()
  const name = faker.person.fullName()
  const userId = faker.string.uuid()

  nock(process.env.BREVO_URL!)
    .post(`/v3/contacts`)
    .reply(200)
    .post(`/v3/smtp/email`)
    .reply(200)

  await agent.post(CREATE_SIMULATION_ROUTE).send({
    simulation: {
      id: simulationId,
      ...simulation,
    },
    email,
    name,
    userId,
  })

  return {
    simulationId,
    email,
    name,
    userId,
  }
}
