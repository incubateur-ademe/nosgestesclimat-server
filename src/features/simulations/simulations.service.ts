import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaError'
import { PollUpdatedEvent } from '../organisations/events/PollUpdated.event'
import type { OrganisationPollParams } from '../organisations/organisations.validator'
import type { UserParams } from '../users/users.validator'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event'
import {
  createPollUserSimulation,
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
  polls: polls.map(({ pollId, poll: { slug } }) => ({ id: pollId, slug })),
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
  const { user } = simulation

  const simulationUpsertedEvent = new SimulationUpsertedEvent({
    simulation,
    origin,
    user,
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

export const createPollSimulation = async ({
  origin,
  params,
  simulationDto,
}: {
  origin: string
  params: OrganisationPollParams
  simulationDto: SimulationCreateDto
}) => {
  try {
    const { poll, simulation } = await createPollUserSimulation(
      params,
      simulationDto
    )
    const { user } = simulation
    const { organisation } = poll

    const pollUpdatedEvent = new PollUpdatedEvent({
      poll,
      organisation,
    })

    const simulationUpsertedEvent = new SimulationUpsertedEvent({
      organisation,
      simulation,
      origin,
      user,
    })

    EventBus.emit(simulationUpsertedEvent).emit(pollUpdatedEvent)

    // @ts-expect-error 2 events different types: TODO fix
    await EventBus.once(simulationUpsertedEvent, pollUpdatedEvent)

    return simulationToDto(simulation, simulationDto.user.id)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Poll not found')
    }
    throw e
  }
}
