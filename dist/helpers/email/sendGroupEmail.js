"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGroupEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const GroupSchema_1 = require("../../schemas/GroupSchema");
const axios_2 = require("../../constants/axios");
const createOrUpdateContact_1 = require("./createOrUpdateContact");
const brevo_1 = require("../../constants/brevo");
async function sendGroupEmail({ group, userId, name, email, isCreation, origin, numberCreatedGroups, }) {
    // If no email or no name is provided, we don't do anything
    if (!email || !name) {
        return;
    }
    // If this is not a creation email and they are the administrator, we don't send the email
    // (they already received it when they created the group)
    if (!isCreation && group.administrator?.userId === userId) {
        return;
    }
    try {
        const groupsCreatedWithOneParticipant = await GroupSchema_1.Group.find({
            'administrator.userId': userId,
            participants: { $size: 1 },
        });
        // Create or update the contact
        await (0, createOrUpdateContact_1.createOrUpdateContact)({
            userId,
            email,
            name,
            listIds: [isCreation ? brevo_1.LIST_ID_GROUP_CREATED : brevo_1.LIST_ID_GROUP_JOINED],
            otherAttributes: isCreation
                ? {
                    [brevo_1.ATTRIBUTE_NUMBER_CREATED_GROUPS]: numberCreatedGroups ?? 0,
                    [brevo_1.ATTRIBUTE_LAST_GROUP_CREATION_DATE]: new Date().toISOString(),
                    [brevo_1.ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]: groupsCreatedWithOneParticipant?.length,
                }
                : {},
        });
        await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
            to: [
                {
                    name: email,
                    email,
                },
            ],
            templateId: isCreation
                ? brevo_1.TEMPLATE_ID_GROUP_CREATED
                : brevo_1.TEMPLATE_ID_GROUP_JOINED,
            params: {
                GROUP_URL: `${origin}/amis/resultats?groupId=${group?._id}&mtm_campaign=voir-mon-groupe-email`,
                SHARE_URL: `${origin}/amis/invitation?groupId=${group?._id}&mtm_campaign=invitation-groupe-email`,
                DELETE_URL: `${origin}/amis/supprimer?groupId=${group?._id}&userId=${userId}&mtm_campaign=invitation-groupe-email`,
                GROUP_NAME: group.name,
                NAME: name,
            },
        }, axios_2.axiosConf);
    }
    catch (error) {
        throw new Error(error);
    }
    console.log(`Email group ${isCreation ? 'creation' : ''} sent to ${email}`);
}
exports.sendGroupEmail = sendGroupEmail;
