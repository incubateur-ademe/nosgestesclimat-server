"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpdateGroupNumberOneParticipant = void 0;
const GroupSchema_1 = require("../../schemas/GroupSchema");
const createOrUpdateContact_1 = require("../email/createOrUpdateContact");
const brevo_1 = require("../../constants/brevo");
async function handleUpdateGroupNumberOneParticipant({ group }) {
    const { userId } = group.administrator;
    const groupsCreatedWithOneParticipant = await GroupSchema_1.Group.find({
        'administrator.userId': userId,
        participants: { $size: 1 },
    });
    await (0, createOrUpdateContact_1.createOrUpdateContact)({
        email: group.administrator.email ?? '',
        userId,
        otherAttributes: {
            [brevo_1.ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]: groupsCreatedWithOneParticipant.length,
        },
    });
}
exports.handleUpdateGroupNumberOneParticipant = handleUpdateGroupNumberOneParticipant;
