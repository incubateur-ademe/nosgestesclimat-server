"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const getPollPublicInfos_1 = require("../../helpers/organisations/getPollPublicInfos");
const router = express_1.default.Router();
/**
 * Fetching multiple polls public infos
 */
router.post('/', async (req, res) => {
    const pollSlugs = req.body.polls;
    if (!pollSlugs || !pollSlugs.length) {
        return res.status(500).json('You must provide at least one poll slug');
    }
    try {
        const pollsPublicInfos = [];
        for (const pollSlug of pollSlugs) {
            const pollPublicInfos = await (0, getPollPublicInfos_1.getPollPublicInfos)({ pollSlug });
            if (pollPublicInfos) {
                pollsPublicInfos.push(pollPublicInfos);
            }
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(pollsPublicInfos);
    }
    catch (error) {
        return res.status(500).send('Error while fetching poll');
    }
});
exports.default = router;
