"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGroupWithComputedResults = void 0;
const GroupSchema_1 = require("../../schemas/GroupSchema");
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const computeResults_1 = require("../simulation/computeResults");
const unformatSituation_1 = require("../../utils/unformatSituation");
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
            const formatedSituation = (0, unformatSituation_1.unformatSituation)(simulationFound?.situation);
            simulationFound.computedResults = (0, computeResults_1.computeResults)(formatedSituation);
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
