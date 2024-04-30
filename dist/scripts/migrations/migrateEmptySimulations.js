"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const config_1 = require("../../config");
async function migrateEmptySimulations() {
    console.log('Start deletion of empty simulations');
    mongoose_1.default.connect(config_1.config.mongo.url);
    try {
        await SimulationSchema_1.Simulation.deleteMany({
            situation: { $exists: false },
        });
        console.log('Empty simulations deletion done');
    }
    catch (error) {
        console.error('Error deleting empty simulation', error);
    }
}
migrateEmptySimulations();
