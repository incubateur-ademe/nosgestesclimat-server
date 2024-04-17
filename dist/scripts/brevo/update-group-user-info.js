"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGroupUserInfo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../../config");
const brevo_1 = require("../../constants/brevo");
const createOrUpdateContact_1 = require("../../helpers/email/createOrUpdateContact");
const GroupSchema_1 = require("../../schemas/GroupSchema");
function processGroupsByAdministrator(groups) {
    const groupsByAdministrator = {};
    for (const group of groups) {
        if (group.administrator.email) {
            if (!groupsByAdministrator[group.administrator.email]) {
                groupsByAdministrator[group.administrator.email] = [];
            }
            groupsByAdministrator[group.administrator.email].push(group);
        }
    }
    return groupsByAdministrator;
}
/**
 * Update the user document for each organisation administrator
 * to save brevo attributes
 */
async function updateGroupUserInfo() {
    try {
        mongoose_1.default.connect(config_1.config.mongo.url);
        const groups = await GroupSchema_1.Group.find({});
        const groupsByAdministrator = processGroupsByAdministrator(groups);
        console.log('Number of groups by administrator', Object.keys(groupsByAdministrator).length);
        for (const administratorEmail in groupsByAdministrator) {
            console.log('Number of groups for', administratorEmail, groupsByAdministrator[administratorEmail].length);
            // Get the last poll updated
            const lastGroupCreated = groupsByAdministrator[administratorEmail]?.sort((a, b) => {
                return b.createdAt.getTime() - a.createdAt.getTime();
            })[0];
            const numberGroupWithOneParticipant = groupsByAdministrator[administratorEmail]?.filter((group) => group.participants.length === 1).length;
            console.log('Updating contact', administratorEmail, numberGroupWithOneParticipant);
            try {
                await (0, createOrUpdateContact_1.createOrUpdateContact)({
                    email: administratorEmail,
                    otherAttributes: {
                        [brevo_1.ATTRIBUTE_NUMBER_CREATED_GROUPS]: groupsByAdministrator[administratorEmail]?.length,
                        [brevo_1.ATTRIBUTE_LAST_GROUP_CREATION_DATE]: lastGroupCreated.createdAt.toISOString(),
                        [brevo_1.ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]: numberGroupWithOneParticipant,
                    },
                });
            }
            catch (error) {
                console.error('Error updating contact', administratorEmail, error);
            }
            console.log('Updated.');
        }
    }
    catch (error) {
        console.error('Error updating group admin contact attributes', error);
    }
    finally {
        mongoose_1.default.disconnect();
        process.exit(0);
    }
}
exports.updateGroupUserInfo = updateGroupUserInfo;
updateGroupUserInfo();
