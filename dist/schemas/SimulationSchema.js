"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Simulation = exports.SimulationSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
exports.SimulationSchema = new Schema({
    // UI stored simulation id
    id: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    actionChoices: Object,
    progression: Number,
    date: {
        type: Date,
        required: true,
    },
    foldedSteps: [String],
    situation: Object,
    computedResults: {
        bilan: Number,
        categories: {
            alimentation: Number,
            transport: Number,
            logement: Number,
            divers: Number,
            'services sociétaux': Number,
        },
    },
    poll: {
        type: Schema.Types.ObjectId,
        ref: 'Poll',
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
    },
    savedViaEmail: Boolean,
    defaultAdditionalQuestionsAnswers: {
        postalCode: String,
        birthdate: String,
    },
}, {
    timestamps: true,
});
exports.Simulation = mongoose_1.default.model('Simulation', exports.SimulationSchema);
