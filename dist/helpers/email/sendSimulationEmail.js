"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSimulationEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
const createOrUpdateContact_1 = require("./createOrUpdateContact");
const brevo_1 = require("../../constants/brevo");
async function sendSimulationEmail({ userDocument, simulationSaved, shouldSendSimulationEmail, origin, }) {
    const { email, userId } = userDocument;
    // If no email is provided, we don't do anything
    if (!email) {
        return;
    }
    // If we should not send the email, we don't do anything
    if (!shouldSendSimulationEmail) {
        return;
    }
    try {
        // Create or update the contact
        await (0, createOrUpdateContact_1.createOrUpdateContact)({
            email,
            userId,
            listIds: [brevo_1.LIST_SUBSCRIBED_END_SIMULATION],
            optin: true,
        });
        await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
            to: [
                {
                    name: email,
                    email,
                },
            ],
            templateId: 55,
            params: {
                SHARE_URL: `${origin}?mtm_campaign=partage-email`,
                SIMULATION_URL: `${origin}/fin?sid=${encodeURIComponent(simulationSaved.id ?? '')}&mtm_campaign=retrouver-ma-simulation`,
            },
        }, axios_2.axiosConf);
    }
    catch (error) {
        throw new Error(error);
    }
    console.log(`Simulation email sent to ${email}`);
}
exports.sendSimulationEmail = sendSimulationEmail;
