"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const AnswerSchema = new Schema({
    data: {
        total: Number,
        progress: Number,
        byCategory: {
            type: Map,
            of: Number,
        },
        // context will be empty if there is no context related to the survey.
        context: {
            type: Map,
        },
    },
    survey: String,
    id: String,
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model('Answer', AnswerSchema);
