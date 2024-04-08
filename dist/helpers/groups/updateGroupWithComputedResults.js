"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGroupWithComputedResults = void 0;
const GroupSchema_1 = require("../../schemas/GroupSchema");
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const computeResults_1 = require("../simulation/computeResults");
async function updateGroupWithComputedResults(group) {
    // Do not update the simulations if they already have computed results
    const participantsWithIncompleteResults = group?.participants?.filter((participant) => participant.simulation?.computedResults
        ?.bilan === undefined);
    if (participantsWithIncompleteResults.length === 0) {
        return group;
    }
    for (const participant of participantsWithIncompleteResults) {
        // Should be populated
        if (participant.simulation) {
            // We can add computed results here
            const simulationFound = await SimulationSchema_1.Simulation.findById(participant.simulation._id);
            if (!simulationFound) {
                continue;
            }
            simulationFound.computedResults = (0, computeResults_1.computeResults)(simulationFound?.situation);
            await simulationFound.save();
        }
    }
    const groupUpdated = await GroupSchema_1.Group.findById(group._id).populate({
        path: 'participants',
        populate: {
            path: 'simulation',
        },
    });
    console.log('Group with missing computed results updated.');
    return groupUpdated;
}
exports.updateGroupWithComputedResults = updateGroupWithComputedResults;
