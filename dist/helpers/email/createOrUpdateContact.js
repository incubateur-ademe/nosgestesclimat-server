"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateContact = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
function createOrUpdateContact({ user, listIds, optin }) {
    return axios_1.default.post('https://api.brevo.com/v3/contacts', {
        email: user.email,
        listIds,
        attributes: {
            userId: user.userId,
            PRENOM: user.name,
            OPT_IN: optin,
        },
        updateEnabled: true,
    }, axios_2.axiosConf);
}
exports.createOrUpdateContact = createOrUpdateContact;
