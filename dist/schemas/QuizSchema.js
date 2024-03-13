"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizAnswer = exports.QuizAnswerSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
exports.QuizAnswerSchema = new Schema({
    simulationId: String,
    answer: String,
    isAnswerCorrect: String,
}, {
    timestamps: true,
});
exports.QuizAnswer = mongoose_1.default.model('QuizAnswer', exports.QuizAnswerSchema);
