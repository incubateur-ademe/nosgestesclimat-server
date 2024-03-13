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
 * Deletes a group.
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
        // If no group is found, we return an error
        if (!group) {
            return res.status(404).send('Error. Group not found.');
        }
        // Check if the user is the group administrator. If not, we return an error
        const isAdministrator = group.administrator.userId === userId;
        if (!isAdministrator) {
            return res.status(401).send('Error. You are not the group administrator.');
        }
        // We delete the group from the simulations of the participants
        for (const participant of group.participants) {
            const simulation = await SimulationSchema_1.Simulation.findById(participant.simulation);
            if (simulation) {
                delete simulation.group;
                await simulation.save();
            }
        }
        // We delete the group
        await group.delete();
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.send(`Group deleted: ${groupId}`);
        console.log(`Group deleted: ${groupId}`);
    }
    catch (error) {
        console.log('Error while deleting group: ', error);
        return res.status(500).send('Error. An error occured.');
    }
});
exports.default = router;
