import { EventBus } from '../../core/event-bus/event-bus'
import { SimulationUpsertedEvent } from './events/SimulationUpserted.event'
import { createUserSimulation } from './simulations.repository'
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
