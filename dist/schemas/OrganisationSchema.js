"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organisation = exports.OrganisationSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const VerificationCodeSchema_1 = require("./VerificationCodeSchema");
const Schema = mongoose_1.default.Schema;
const AdministratorSchema = new Schema({
    name: String,
    email: String,
    telephone: String,
    position: String,
    verificationCode: VerificationCodeSchema_1.VerificationCodeSchema,
    hasOptedInForCommunications: Boolean,
    userId: String,
}, {
    timestamps: true,
});
exports.OrganisationSchema = new Schema({
    administrators: [AdministratorSchema],
    polls: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Poll',
        },
    ],
    name: String,
    slug: String,
}, {
    timestamps: true,
});
exports.Organisation = mongoose_1.default.model('Organisation', exports.OrganisationSchema);
