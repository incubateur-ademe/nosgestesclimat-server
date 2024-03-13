"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Poll = exports.PollSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const nanoid_1 = require("nanoid");
const Schema = mongoose_1.default.Schema;
// Should this include a reference to the parent organisation?
exports.PollSchema = new Schema({
    name: String,
    slug: {
        type: String,
        default: () => (0, nanoid_1.nanoid)(6),
        unique: true,
    },
    simulations: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Simulation',
        },
    ],
    startDate: Date,
    endDate: Date,
    defaultAdditionalQuestions: [String],
    expectedNumberOfParticipants: Number,
}, {
    timestamps: true,
});
exports.Poll = mongoose_1.default.model('Poll', exports.PollSchema);
