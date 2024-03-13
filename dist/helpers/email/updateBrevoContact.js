"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBrevoContact = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
async function updateBrevoContact({ email, hasOptedInForCommunications, name, }) {
    // Update contact
    try {
        await axios_1.default.put(`https://api.brevo.com/v3/contacts/${encodeURI(email)}`, {
            attributes: {
                OPT_IN: hasOptedInForCommunications,
                PRENOM: name,
            },
        }, axios_2.axiosConf);
    }
    catch (error) {
        throw new Error(error);
    }
}
exports.updateBrevoContact = updateBrevoContact;
