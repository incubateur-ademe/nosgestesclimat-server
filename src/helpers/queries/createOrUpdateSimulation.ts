import type { SimulationType } from '../../schemas/SimulationSchema'
import { Simulation } from '../../schemas/SimulationSchema'

export async function createOrUpdateSimulation(
  simulationToAdd: Partial<SimulationType>
) {
  const simulation = await Simulation.findOneAndUpdate(
    {
      id: simulationToAdd.id,
    },
    simulationToAdd,
    { upsert: true, new: true }
  )

  return simulation
}
