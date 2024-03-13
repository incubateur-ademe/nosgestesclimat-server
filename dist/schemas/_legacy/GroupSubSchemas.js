"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberSchema = exports.OwnerSchema = void 0;
const mongoose_1 = require("mongoose");
const SimulationPreciseSchema_1 = require("./SimulationPreciseSchema");
exports.OwnerSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    userId: {
        type: String,
        required: false,
    },
});
exports.MemberSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: true,
    },
    simulation: SimulationPreciseSchema_1.SimulationPreciseSchema,
    userId: {
        type: String,
        required: true,
    },
});
