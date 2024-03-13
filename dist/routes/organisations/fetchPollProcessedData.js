"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const processPollData_1 = require("../../helpers/organisations/processPollData");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    const orgaSlug = req.body.orgaSlug;
    const userId = req.body.userId;
    if (!orgaSlug) {
        return res.status(403).json('No orgaSlug provided.');
    }
    try {
        const organisationFound = await OrganisationSchema_1.Organisation.findOne({
            slug: {
                $eq: orgaSlug,
            },
        }).populate({
            path: 'polls',
            populate: {
                path: 'simulations',
                populate: {
                    path: 'user',
                },
            },
        });
        if (!organisationFound) {
            return res.status(403).json('No organisation found.');
        }
        // TODO : fix this
        /*
          if (
            !organisationFound.polls[0].simulations.some(
              // @ts-ignore
              (simulation) => simulation?.user?._id.toString() === userId
            )
          ) {
            return res.status(403).json("User id doesn't match any simulation.")
          }
          */
        const pollData = (0, processPollData_1.processPollData)({
            simulations: organisationFound?.polls[0]
                ?.simulations,
            userId: userId ?? '',
        });
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json({
            ...pollData,
            organisationName: organisationFound?.name,
            defaultAdditionalQuestions: organisationFound?.polls[0]?.defaultAdditionalQuestions,
            isAdmin: organisationFound?.administrators.some((admin) => admin?.userId === userId),
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json('Server error.');
    }
});
exports.default = router;
