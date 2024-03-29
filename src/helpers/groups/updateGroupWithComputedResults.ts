import { Document } from 'mongoose'
import { Group, GroupType } from '../../schemas/GroupSchema'
import { Simulation, SimulationType } from '../../schemas/SimulationSchema'
import { computeResults } from '../simulation/computeResults'

export async function updateGroupWithComputedResults(group: GroupType) {
  // Do not update the simulations if they already have computed results

  const participantsWithIncompleteResults = group?.participants?.filter(
    (participant) =>
      (participant.simulation as unknown as SimulationType)?.computedResults
        ?.bilan === undefined
  )

  if (participantsWithIncompleteResults.length === 0) {
    return group
  }

  for (const participant of participantsWithIncompleteResults) {
    // Should be populated
    if (participant.simulation) {
      console.log('COMPUTING RESULTS')
      // We can add computed results here
      const simulationFound = await Simulation.findById(
        (participant.simulation as unknown as SimulationType)._id
      )

      if (!simulationFound) {
        continue
      }

      simulationFound.computedResults = computeResults(
        (simulationFound as unknown as SimulationType)?.situation
      )

      await simulationFound.save()
    }
  }

  const groupUpdated = await Group.findById(group._id).populate({
    path: 'participants',
    populate: {
      path: 'simulation',
    },
  })

  console.log('Group with missing computed results updated.')
  return groupUpdated
}
