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
 * Fetching a poll public infos
 */
router
    .route('/:pollSlug?')
    .get(async (req, res) => {
    const pollSlug = req.params.pollSlug;
    if (!pollSlug) {
        return res.status(500).send('You must provide a poll slug');
    }
    try {
        const pollPublicInfos = await (0, getPollPublicInfos_1.getPollPublicInfos)({ pollSlug });
        if (!pollPublicInfos) {
            return res.status(404).send('This poll does not exist');
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(pollPublicInfos);
    }
    catch (error) {
        return res.status(500).send('Error while fetching poll');
    }
});
exports.default = router;
