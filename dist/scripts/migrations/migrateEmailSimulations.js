"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const EmailSimulationSchema_1 = __importDefault(require("../../schemas/_legacy/EmailSimulationSchema"));
const config_1 = require("../../config");
async function migrateEmailSimulations() {
    mongoose_1.default.connect(config_1.config.mongo.url);
    try {
        const emailSimulations = await EmailSimulationSchema_1.default.find();
        console.log('Email simulations to migrate', emailSimulations.length);
        for (const emailSimulation of emailSimulations) {
            const data = emailSimulation.data;
            if (!data) {
                console.log(`Email simulation not migrated: ${emailSimulation._id}, no data.`);
                continue;
            }
            const newSimulation = new SimulationSchema_1.Simulation({
                _id: new mongoose_1.default.Types.ObjectId(emailSimulation._id),
                id: data.id,
                actionChoices: data.actionChoices,
                date: data.date ?? new Date(),
                foldedSteps: data.foldedSteps,
                situation: data.situation,
                progression: 1,
            });
            await newSimulation.save();
            //await emailSimulation.delete()
            console.log(`Email simulation migrated: ${emailSimulation._id}, emailSimulation deleted.`);
        }
        console.log('Email simulations migrated');
    }
    catch (error) {
        console.error('Error migrating email simulations', error);
    }
}
migrateEmailSimulations();
