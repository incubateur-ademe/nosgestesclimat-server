"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactLists = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
async function getContactLists(email) {
    try {
        const response = await axios_1.default.get(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, axios_2.axiosConf);
        const contactData = response.data;
        return contactData.listIds;
    }
    catch (error) {
        return error;
    }
}
exports.getContactLists = getContactLists;
