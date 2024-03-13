"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GroupSchema_1 = require("../../schemas/GroupSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const updateGroupWithComputedResults_1 = require("../../helpers/groups/updateGroupWithComputedResults");
const router = express_1.default.Router();
/**
 * Fetch a group
 * It requires a groupId
 */
router.route('/').post(async (req, res) => {
    const groupId = req.body.groupId;
    if (!groupId) {
        return res.status(500).send('Error. A groupId must be provided.');
    }
    try {
        const group = await GroupSchema_1.Group.findById(groupId).populate('participants.simulation');
        // If no group is found, we return an error
        if (!group) {
            return res.status(404).send('Error. Group not found.');
        }
        (0, updateGroupWithComputedResults_1.updateGroupWithComputedResults)(group);
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(group);
        console.log(`Group fetched: ${groupId}`);
    }
    catch (error) {
        res.status(500).send('Error. Group not found.');
    }
});
exports.default = router;
