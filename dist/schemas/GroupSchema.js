"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Group = exports.GroupSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const GroupSubSchemas_1 = require("./_legacy/GroupSubSchemas");
const Schema = mongoose_1.default.Schema;
const ParticipantSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: String,
    userId: {
        type: String,
        required: true,
    },
    simulation: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Simulation',
    },
});
exports.GroupSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    emoji: {
        type: String,
        required: true,
    },
    administrator: {
        name: {
            type: String,
            required: true,
        },
        email: String,
        userId: {
            type: String,
            required: true,
        },
    },
    participants: [ParticipantSchema],
    // Legacy from previous version
    // We should remove it before going to production
    owner: GroupSubSchemas_1.OwnerSchema,
    members: [GroupSubSchemas_1.MemberSchema],
}, {
    timestamps: true,
});
exports.Group = mongoose_1.default.model('Group', exports.GroupSchema);
