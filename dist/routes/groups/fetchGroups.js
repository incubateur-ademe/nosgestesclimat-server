"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const GroupSchema_1 = require("../../schemas/GroupSchema");
const router = express_1.default.Router();
/**
 * Fetching groups of a user
 * It requires a userId and a list of groupIds
 */
router.post('/', async (req, res) => {
    const groupIds = req.body.groupIds;
    const userId = req.body.userId;
    // If no userId is provided, we return an error
    if (!userId) {
        return res.status(500).json('Error. A userId must be provided.');
    }
    try {
        let groupsOfUser = [];
        // If no groupIds are provided, we check if the user is a participant in any group
        if (!groupIds) {
            groupsOfUser = await GroupSchema_1.Group.find({
                participants: { $elemMatch: { userId: userId } },
            });
        }
        // If it is provided, we check if the user is a participant in the provided groups
        if (groupIds) {
            const groups = await GroupSchema_1.Group.find({ _id: { $in: groupIds } });
            groupsOfUser = groups.filter((group) => group.participants.find((participant) => participant.userId === userId));
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(groupsOfUser);
        console.log(`Groups of user ${userId} fetched`);
    }
    catch (error) {
        return res.status(500).send('Error while fetching groups');
    }
});
exports.default = router;
