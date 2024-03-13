"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
async function sendEmail({ email, params, attributes, templateId, }) {
    // Add contact to list
    try {
        await axios_1.default.post('https://api.brevo.com/v3/contacts', {
            email,
            attributes,
        }, axios_2.axiosConf);
    }
    catch (error) {
        // Do nothing, the contact already exists
    }
    await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
        to: [
            {
                name: email,
                email,
            },
        ],
        templateId,
        params,
    }, axios_2.axiosConf);
}
exports.sendEmail = sendEmail;
