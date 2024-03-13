"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationCode = exports.VerificationCodeSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
exports.VerificationCodeSchema = new Schema({
    code: {
        type: String,
        length: 6,
        required: true,
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});
exports.VerificationCode = mongoose_1.default.model('VerificationCode', exports.VerificationCodeSchema);
