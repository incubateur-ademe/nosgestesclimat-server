"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateSimulation = void 0;
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
async function createOrUpdateSimulation(simulationToAdd) {
    const simulation = await SimulationSchema_1.Simulation.findOneAndUpdate({
        id: simulationToAdd.id,
    }, simulationToAdd, { upsert: true, new: true });
    console.log(`Simulation ${simulation.id} created or updated.`);
    return simulation;
}
exports.createOrUpdateSimulation = createOrUpdateSimulation;
