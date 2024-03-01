import { Simulation, SimulationType } from '../../schemas/SimulationSchema'

export async function createOrUpdateSimulation(
  simulationToAdd: SimulationType
) {
  const simulation = await Simulation.findOneAndUpdate(
    {
      id: simulationToAdd.id,
    },
    simulationToAdd,
    { upsert: true, new: true }
  )

  console.log(`Simulation ${simulation.id} created or updated.`)

  return simulation
}
