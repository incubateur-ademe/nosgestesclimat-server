"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpdateGroup = void 0;
const sendGroupEmail_1 = require("../email/sendGroupEmail");
const handleUpdateNumberGroupOneParticipant_1 = require("./handleUpdateNumberGroupOneParticipant");
async function handleUpdateGroup({ group, userDocument, simulationSaved, origin, }) {
    // If there is no group, we do nothing
    if (!group) {
        return;
    }
    const participantWithSimulation = group.participants.find((participant) => participant.userId === userDocument.userId);
    // If the user is already in the group, we update their simulation
    if (participantWithSimulation) {
        participantWithSimulation.simulation = simulationSaved._id;
        await group.save();
        console.log(`Simulation updated in group ${group.name}.`);
        return;
    }
    // Otherwise, we add the user (and its simulation) to the group
    group.participants.push({
        name: userDocument.name || '🦊',
        email: userDocument.email,
        userId: userDocument.userId,
        simulation: simulationSaved._id,
    });
    const groupSaved = await group.save();
    // Update the number of group with one participant of the administrator
    await (0, handleUpdateNumberGroupOneParticipant_1.handleUpdateGroupNumberOneParticipant)({
        group: groupSaved,
    });
    console.log(`User and simulation saved in group ${group._id} (${group.name}).`);
    // Send creation confirmation email to the participant (if an email is provided)
    (0, sendGroupEmail_1.sendGroupEmail)({
        group,
        userId: userDocument.userId,
        name: userDocument.name,
        email: userDocument.email,
        isCreation: false,
        origin,
    });
}
exports.handleUpdateGroup = handleUpdateGroup;
