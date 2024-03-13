import { Document } from "mongoose";
import { GroupType } from "../../schemas/GroupSchema";
import { Simulation, SimulationType } from "../../schemas/SimulationSchema";
import { computeResults } from "../simulation/computeResults";

export async function updateGroupWithComputedResults(group: GroupType) {
  if (group.participants.every((participant) => (participant.simulation as unknown as SimulationType)?.computedResults)) {
    return
  }

  if (group.participants) {
    for (const participant of group.participants) {
      if (participant.simulation) {
        // We can add computed results here
        const simulationFound = await Simulation.findById(participant.simulation)

        if (!simulationFound || simulationFound.computedResults) {
          continue
        }

        simulationFound.computedResults = computeResults(simulationFound)
        await simulationFound.save()

      }
    }
  }
}