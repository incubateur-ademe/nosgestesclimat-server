"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GroupSchema_1 = require("../../schemas/GroupSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const router = express_1.default.Router();
/**
 * This route removes a participant from a group.
 * It requires a groupId and a userId.
 */
router.route('/').post(async (req, res) => {
    const groupId = req.body.groupId;
    const userId = req.body.userId;
    // If no groupId or userId is provided, we return an error
    if (!groupId) {
        return res.status(500).send('Error. A groupId must be provided.');
    }
    if (!userId) {
        return res.status(500).send('Error. A userId must be provided.');
    }
    try {
        const group = await GroupSchema_1.Group.findById(groupId).populate('participants.simulation');
        // If there is no group associated with the groupId, we return an error
        if (!group) {
            return res.status(404).send('Error. Group not found.');
        }
        const participant = group.participants.find((participant) => participant.userId === userId);
        // If the user is not a participant of the group, we return an error
        if (!participant) {
            return res.status(404).send('Error. The user is not in the group.');
        }
        // We delete the group from the simulation of the participant
        const simulation = await SimulationSchema_1.Simulation.findById(participant.simulation);
        if (simulation) {
            delete simulation.group;
            await simulation.save();
        }
        // We remove the user from the list of participants
        group.participants = group.participants.filter((participant) => participant.userId !== userId);
        await group.save();
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(group);
        console.log(`User removed: ${userId} removed from group ${groupId}.`);
    }
    catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});
exports.default = router;
