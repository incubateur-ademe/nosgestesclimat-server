"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
exports.UserSchema = new Schema({
    name: String,
    email: String,
    userId: {
        type: String,
        unique: true,
    },
}, { timestamps: true });
exports.User = mongoose_1.default.model('User', exports.UserSchema);
