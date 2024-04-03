"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const config_1 = require("../../config");
async function migratePollAndGroup() {
    console.log('Start migration of poll and group');
    mongoose_1.default.connect(config_1.config.mongo.url);
    try {
        const simulationsWithPollOrGroup = await SimulationSchema_1.Simulation.find({
            $or: [{ group: { $ne: null } }, { poll: { $ne: null } }],
        });
        console.log('Simulations to migrate', simulationsWithPollOrGroup.length);
        for (const simulation of simulationsWithPollOrGroup) {
            if (simulation.poll) {
                simulation.polls = [simulation.poll];
                delete simulation.poll;
            }
            if (simulation.group) {
                simulation.groups = [simulation.group];
                delete simulation.group;
            }
            await simulation.save();
            console.log(`Simulation migrated: ${simulation._id}.`);
        }
        console.log('Simulations poll and group migration done');
    }
    catch (error) {
        console.error('Error migrating simulations poll and group', error);
    }
}
migratePollAndGroup();
