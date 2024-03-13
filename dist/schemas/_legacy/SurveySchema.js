"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const SurveySchema = new Schema({
    name: String,
    id: String,
    contextFile: String,
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model('Survey', SurveySchema);
