"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NorthstarRating = exports.NorthstarRatingSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
exports.NorthstarRatingSchema = new Schema({
    simulationId: String,
    value: String,
    type: String,
}, {
    timestamps: true,
});
exports.NorthstarRating = mongoose_1.default.model('NorthstarRating', exports.NorthstarRatingSchema);
