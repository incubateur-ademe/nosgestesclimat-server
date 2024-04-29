"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const NorthstarSchema_1 = require("../../schemas/NorthstarSchema");
const config_1 = require("../../config");
async function migrateNorthstarRatings() {
    console.log('Start migration of northstar ratings');
    mongoose_1.default.connect(config_1.config.mongo.url);
    try {
        const simulationWithData = (await SimulationSchema_1.Simulation.find({
            data: { $exists: true },
        }));
        console.log('Northstar ratings to migrate', simulationWithData.length);
        for (const simulation of simulationWithData) {
            if (simulation.data?.ratings) {
                const type = simulation.data.ratings.learned ? 'learned' : 'actions';
                const value = type === 'learned'
                    ? simulation.data.ratings.learned
                    : simulation.data.ratings.actions;
                if ([0, 1, 2, 3].includes(value)) {
                    const northstarRating = new NorthstarSchema_1.NorthstarRating({
                        simulationId: simulation.id,
                        value,
                        type,
                        createdAt: simulation.createdAt,
                        updatedAt: simulation.updatedAt,
                    });
                    await northstarRating.save();
                    console.log(`Northstar migrated: ${simulation._id}.`);
                }
            }
        }
        console.log('Northstar ratings migration done');
    }
    catch (error) {
        console.error('Error migrating northstar ratings', error);
    }
}
migrateNorthstarRatings();
