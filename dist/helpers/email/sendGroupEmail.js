"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGroupEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
const createOrUpdateContact_1 = require("./createOrUpdateContact");
/**
 * Send an email to a user when they join a group or when a group is created (based on the isCreation parameter)
 */
const TEMPLATE_ID_GROUP_CREATED = 57;
const TEMPLATE_ID_GROUP_JOINED = 58;
const LIST_ID_GROUP_CREATED = 29;
const LIST_ID_GROUP_JOINED = 30;
async function sendGroupEmail({ group, userId, name, email, isCreation, origin, }) {
    // If no email or no name is provided, we don't do anything
    if (!email || !name) {
        return;
    }
    // If this is not a creation email and they are the administrator, we don't send the email
    // (they already received it when they created the group)
    if (!isCreation && group.administrator?.userId === userId) {
        return;
    }
    // Create or update the contact
    await (0, createOrUpdateContact_1.createOrUpdateContact)({
        user: {
            userId,
            email,
            name,
        },
        listIds: [isCreation ? LIST_ID_GROUP_CREATED : LIST_ID_GROUP_JOINED],
    });
    await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
        to: [
            {
                name: email,
                email,
            },
        ],
        templateId: isCreation
            ? TEMPLATE_ID_GROUP_CREATED
            : TEMPLATE_ID_GROUP_JOINED,
        params: {
            GROUP_URL: `${origin}/amis/resultats?groupId=${group?._id}&mtm_campaign=voir-mon-groupe-email`,
            SHARE_URL: `${origin}/amis/invitation?groupId=${group?._id}&mtm_campaign=invitation-groupe-email`,
            DELETE_URL: `${origin}/amis/supprimer?groupId=${group?._id}&userId=${userId}&mtm_campaign=invitation-groupe-email`,
            GROUP_NAME: group.name,
            NAME: name,
        },
    }, axios_2.axiosConf);
    console.log(`Email group ${isCreation ? 'creation' : ''} sent to ${email}`);
}
exports.sendGroupEmail = sendGroupEmail;
