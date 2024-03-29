import { Document } from 'mongoose'
import { GroupType } from '../../schemas/GroupSchema'
import { Simulation, SimulationType } from '../../schemas/SimulationSchema'
import { computeResults } from '../simulation/computeResults'

export async function updateGroupWithComputedResults(group: GroupType) {
  // Do not update the simulations if they already have computed results
  if (
    !group.participants ||
    group.participants.length === 0 ||
    group.participants.every(
      (participant) =>
        !!(participant.simulation as unknown as SimulationType)?.computedResults
    )
  ) {
    return
  }

  for (const participant of group.participants) {
    // Should be populated
    if (participant.simulation) {
      // We can add computed results here
      const simulationFound = await Simulation.findById(
        (participant.simulation as unknown as SimulationType)._id
      )

      if (!simulationFound || simulationFound.computedResults) {
        continue
      }

      simulationFound.computedResults = computeResults(simulationFound)

      await simulationFound.save()
    }
  }
}
