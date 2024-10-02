import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import type { UserParams } from '../groups/groups.validator'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event'
import {
  createUserSimulation,
  fetchUserSimulation,
  fetchUserSimulations,
} from './simulations.repository'
import type { UserSimulationParams } from './simulations.validator'
import { type SimulationCreateDto } from './simulations.validator'

const simulationToDto = (
  { polls, user, ...rest }: Awaited<ReturnType<typeof createUserSimulation>>,
  connectedUser: string
) => ({
  ...rest,
  polls: polls.map(({ pollId }) => ({ id: pollId })),
  user: user.id === connectedUser ? user : { name: user.name },
})

export const createSimulation = async ({
  simulationDto,
  origin,
}: {
  simulationDto: SimulationCreateDto
  origin: string
}) => {
  const simulation = await createUserSimulation(simulationDto)

  const simulationUpsertedEvent = new SimulationUpsertedEvent({
    origin,
    simulation,
  })

  EventBus.emit(simulationUpsertedEvent)

  await EventBus.once(simulationUpsertedEvent)

  return simulationToDto(simulation, simulationDto.user.id)
}

export const fetchSimulations = async (params: UserParams) => {
  const simulations = await fetchUserSimulations(params)

  return simulations.map((s) => simulationToDto(s, params.userId))
}

export const fetchSimulation = async (params: UserSimulationParams) => {
  try {
    const simulation = await fetchUserSimulation(params)

    return simulationToDto(simulation, params.userId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Simulation not found')
    }
    throw e
  }
}
