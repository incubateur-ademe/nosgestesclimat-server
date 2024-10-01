import { createUserSimulation } from './simulations.repository'
import { type SimulationCreateDto } from './simulations.validator'

const simulationToDto = (
  {
    polls,
    user,
    ...rest
  }: Awaited<ReturnType<typeof createUserSimulation>>['simulation'],
  connectedUser: string
) => ({
  ...rest,
  polls: polls.map(({ pollId }) => ({ id: pollId })),
  user: user.id === connectedUser ? user : { name: user.name },
})

export const createSimulation = async ({
  simulationDto,
}: {
  simulationDto: SimulationCreateDto
  origin: string
}) => {
  const { simulation } = await createUserSimulation(simulationDto)

  return simulationToDto(simulation, simulationDto.user.id)
}
