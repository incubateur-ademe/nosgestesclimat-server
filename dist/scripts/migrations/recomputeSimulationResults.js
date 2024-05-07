"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const config_1 = require("../../config");
const computeResults_1 = require("../../helpers/simulation/computeResults");
const co2_model_FR_lang_fr_json_1 = __importDefault(require("@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json"));
const publicodes_1 = __importDefault(require("publicodes"));
async function recomputeResults() {
    mongoose_1.default.connect(config_1.config.mongo.url);
    try {
        const simulations = await SimulationSchema_1.Simulation.find({
            modifiedAt: { $lt: new Date('2024-03-29') },
        });
        console.log('Simulations to recompute', simulations.length);
        let engine = new publicodes_1.default(co2_model_FR_lang_fr_json_1.default);
        let simulation;
        for (simulation of simulations) {
            simulation.computedResults = (0, computeResults_1.computeResults)(simulation.situation, engine);
            await simulation.save();
        }
        console.log('Simulations updated');
    }
    catch (error) {
        console.error('Error updating simulations', error);
    }
}
recomputeResults();
