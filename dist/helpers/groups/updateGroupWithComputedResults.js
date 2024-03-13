"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGroupWithComputedResults = void 0;
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const computeResults_1 = require("../simulation/computeResults");
async function updateGroupWithComputedResults(group) {
    if (group.participants.every((participant) => participant.simulation?.computedResults)) {
        return;
    }
    if (group.participants) {
        for (const participant of group.participants) {
            if (participant.simulation) {
                // We can add computed results here
                const simulationFound = await SimulationSchema_1.Simulation.findById(participant.simulation);
                if (!simulationFound || simulationFound.computedResults) {
                    continue;
                }
                simulationFound.computedResults = (0, computeResults_1.computeResults)(simulationFound);
                await simulationFound.save();
            }
        }
    }
}
exports.updateGroupWithComputedResults = updateGroupWithComputedResults;
