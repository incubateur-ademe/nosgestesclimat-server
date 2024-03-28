"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const findPopulatedPollBySlug_1 = require("../../helpers/organisations/findPopulatedPollBySlug");
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const router = express_1.default.Router();
/**
 * Verify if a user has already participated in a poll
 */
router.route('/').post(async (req, res) => {
    const pollSlug = req.body.pollSlug;
    const userId = req.body.userId;
    const email = req.body.email;
    if (!pollSlug) {
        return res.status(500).send('You must provide a poll slug');
    }
    if (!userId) {
        return res.status(500).send('You must provide a user id');
    }
    try {
        const poll = await (0, findPopulatedPollBySlug_1.findPopulatedPollBySlug)(pollSlug);
        if (!poll) {
            return res.status(404).send('This poll does not exist');
        }
        const hasUserAlreadyParticipated = poll.simulations.some((simulation) => {
            if ((simulation?.user).userId === userId) {
                return true;
            }
            if ((simulation?.user).email &&
                (simulation?.user).email === email) {
                return true;
            }
        });
        let organisation = undefined;
        if (hasUserAlreadyParticipated) {
            organisation = await OrganisationSchema_1.Organisation.findOne({
                polls: {
                    $in: poll._id,
                },
            });
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json({
            hasUserAlreadyParticipated,
            organisationSlug: organisation?.slug,
        });
    }
    catch (error) {
        return res.status(500).send('Error while fetching poll');
    }
});
exports.default = router;
