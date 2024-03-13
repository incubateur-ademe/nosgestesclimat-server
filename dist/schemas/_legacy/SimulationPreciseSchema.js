"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationPreciseModel = exports.SimulationPreciseSchema = void 0;
/**
 * Legacy from previous version
 */
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
exports.SimulationPreciseSchema = new Schema({
    id: String,
    actionChoices: Object,
    conference: {
        type: Object,
        required: false,
    },
    config: {
        type: Object,
        required: false,
    },
    date: {
        type: Date,
        required: true,
    },
    enquête: {
        type: Object,
        required: false,
    },
    eventsSent: Object,
    foldedSteps: [String],
    hiddenNotifications: [String],
    persona: {
        type: Object,
        required: false,
    },
    ratings: {
        learned: String,
        action: String,
    },
    situation: {
        type: Object,
        required: false,
    },
    storedAmortissementAvion: {
        type: Object,
        required: false,
    },
    storedTrajets: {
        type: Object,
        required: false,
    },
    survey: {
        type: Object,
        required: false,
    },
    targetUnit: {
        type: String,
        required: false,
    },
    unfoldedStep: {
        type: String,
        required: false,
    },
    url: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
});
exports.SimulationPreciseModel = mongoose_1.default.model('SimulationPrecise', exports.SimulationPreciseSchema);
