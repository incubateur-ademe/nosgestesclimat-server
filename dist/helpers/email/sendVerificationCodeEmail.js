"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationCodeEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
const createOrUpdateContact_1 = require("./createOrUpdateContact");
const brevo_1 = require("../../constants/brevo");
async function sendVerificationCodeEmail({ email, verificationCode, }) {
    try {
        // Add contact to the list or update it
        await (0, createOrUpdateContact_1.createOrUpdateContact)({
            email,
            listIds: [brevo_1.LIST_ID_ORGANISATIONS],
            otherAttributes: {
                ATTRIBUTE_IS_ORGANISATION_ADMIN: true,
            },
        });
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
        console.log(error);
        console.log('Error sending email: ');
    }
}
exports.sendVerificationCodeEmail = sendVerificationCodeEmail;
