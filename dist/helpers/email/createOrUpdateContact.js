"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateContact = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
const handleAddAttributes_1 = require("../brevo/handleAddAttributes");
function createOrUpdateContact({ email, name, userId, listIds, optin, otherAttributes = {}, simulation, }) {
    if (!email) {
        return;
    }
    const attributes = (0, handleAddAttributes_1.handleAddAttributes)({
        name,
        userId,
        optin,
        simulation,
        otherAttributes,
    });
    return axios_1.default.post('https://api.brevo.com/v3/contacts', {
        email,
        listIds,
        attributes,
        updateEnabled: true,
    }, axios_2.axiosConf);
}
exports.createOrUpdateContact = createOrUpdateContact;
