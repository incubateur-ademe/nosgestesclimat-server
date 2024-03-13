"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const slugify_1 = __importDefault(require("slugify"));
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const updateBrevoContact_1 = require("../../helpers/email/updateBrevoContact");
const authentificationMiddleware_1 = require("../../middlewares/authentificationMiddleware");
const PollSchema_1 = require("../../schemas/PollSchema");
const findUniqueSlug_1 = require("../../helpers/organisations/findUniqueSlug");
const router = express_1.default.Router();
/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware_1.authentificationMiddleware).post('/', async (req, res) => {
    const email = req.body.email;
    if (!email) {
        return res.status(401).send('Error. An email address must be provided.');
    }
    const organisationName = req.body.name;
    const administratorName = req.body.administratorName;
    const defaultAdditionalQuestions = req.body.defaultAdditionalQuestions;
    const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? false;
    const expectedNumberOfParticipants = req.body.expectedNumberOfParticipants;
    const administratorPosition = req.body.administratorPosition ?? '';
    const administratorTelephone = req.body.administratorTelephone ?? '';
    try {
        const organisationFound = await OrganisationSchema_1.Organisation.findOne({
            'administrators.email': email,
        }).populate('polls');
        if (!organisationFound) {
            return res.status(403).json('No matching organisation found.');
        }
        if (organisationName) {
            organisationFound.name = organisationName;
        }
        if (!organisationFound.slug) {
            const uniqueSlug = await (0, findUniqueSlug_1.findUniqueSlug)((0, slugify_1.default)(organisationName.toLowerCase()));
            organisationFound.slug = uniqueSlug;
        }
        const administratorModifiedIndex = organisationFound.administrators.findIndex(({ email: administratorEmail }) => administratorEmail === email);
        if (administratorName && administratorModifiedIndex !== -1) {
            organisationFound.administrators[administratorModifiedIndex].name =
                administratorName;
        }
        if (administratorPosition && administratorModifiedIndex !== -1) {
            organisationFound.administrators[administratorModifiedIndex].position =
                administratorPosition;
        }
        if (administratorTelephone && administratorModifiedIndex !== -1) {
            organisationFound.administrators[administratorModifiedIndex].position =
                administratorTelephone;
        }
        if (administratorModifiedIndex !== -1) {
            organisationFound.administrators[administratorModifiedIndex].hasOptedInForCommunications = hasOptedInForCommunications;
        }
        const pollUpdated = await PollSchema_1.Poll.findById(organisationFound.polls[0]._id);
        if (pollUpdated && defaultAdditionalQuestions) {
            pollUpdated.defaultAdditionalQuestions = defaultAdditionalQuestions;
        }
        if (pollUpdated && expectedNumberOfParticipants) {
            pollUpdated.expectedNumberOfParticipants = expectedNumberOfParticipants;
        }
        if (pollUpdated &&
            (defaultAdditionalQuestions || expectedNumberOfParticipants)) {
            await pollUpdated.save();
        }
        // Save the modifications
        await organisationFound.save();
        if (administratorName || hasOptedInForCommunications !== undefined) {
            (0, updateBrevoContact_1.updateBrevoContact)({
                email,
                name: administratorName,
                hasOptedInForCommunications,
            });
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        const organisationResult = await OrganisationSchema_1.Organisation.findOne({
            'administrators.email': email,
        }).populate('polls');
        res.json(organisationResult);
    }
    catch (error) {
        return res.status(403).json(error);
    }
});
exports.default = router;
