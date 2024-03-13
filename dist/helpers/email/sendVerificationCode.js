"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationCode = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
async function sendVerificationCode({ email, verificationCode }) {
    // Add contact to list
    try {
        await axios_1.default.post('https://api.brevo.com/v3/contacts', {
            email,
            listIds: [27],
            attributes: {
                OPT_IN: false,
            },
        }, axios_2.axiosConf);
    }
    catch (error) {
        // Do nothing, the contact already exists
    }
    try {
        await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
            to: [
                {
                    name: email,
                    email,
                },
            ],
            templateId: 66,
            params: {
                VERIFICATION_CODE: verificationCode,
            },
        }, axios_2.axiosConf);
    }
    catch (error) {
        console.log('Error sending email: ');
    }
}
exports.sendVerificationCode = sendVerificationCode;
