"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSendVerificationCodeAndReturnExpirationDate = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const sendVerificationCodeEmail_1 = require("../email/sendVerificationCodeEmail");
const generateRandomNumberWithLength_1 = require("../../utils/generateRandomNumberWithLength");
const VerificationCodeSchema_1 = require("../../schemas/VerificationCodeSchema");
async function handleSendVerificationCodeAndReturnExpirationDate({ email, userId, }) {
    // Generate a random code
    const verificationCode = (0, generateRandomNumberWithLength_1.generateRandomNumberWithLength)(6);
    const expirationDate = (0, dayjs_1.default)().add(1, 'hour').toDate();
    // Create a new verification code
    const verificationCodeCreated = new VerificationCodeSchema_1.VerificationCode({
        code: verificationCode,
        expirationDate,
        email,
    });
    const verificationCodeSaved = await verificationCodeCreated.save();
    // Send the code by email
    await (0, sendVerificationCodeEmail_1.sendVerificationCodeEmail)({
        email,
        verificationCode,
    });
    return verificationCodeSaved;
}
exports.handleSendVerificationCodeAndReturnExpirationDate = handleSendVerificationCodeAndReturnExpirationDate;
