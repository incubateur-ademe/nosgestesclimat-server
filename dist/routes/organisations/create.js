"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const handleSendVerificationCodeAndReturnExpirationDate_1 = require("../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate");
const PollSchema_1 = require("../../schemas/PollSchema");
const router = express_1.default.Router();
router.route('/').post(async (req, res) => {
    try {
        const email = req.body.email;
        const userId = req.body.userId;
        if (!email) {
            return res.status(403).json('Error. An email address must be provided.');
        }
        const pollCreated = new PollSchema_1.Poll({
            //TODO: it should be unique and not random
            simulations: [],
        });
        const newlySavedPoll = await pollCreated.save();
        const organisationCreated = new OrganisationSchema_1.Organisation({
            administrators: [
                {
                    email,
                    userId,
                },
            ],
            polls: [newlySavedPoll._id],
        });
        // Save the organisation
        const newlySavedOrganisation = await organisationCreated.save();
        const verificationCodeObject = await (0, handleSendVerificationCodeAndReturnExpirationDate_1.handleSendVerificationCodeAndReturnExpirationDate)(email);
        newlySavedOrganisation.administrators[0].verificationCode =
            verificationCodeObject;
        await newlySavedOrganisation.save();
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json({ expirationDate: verificationCodeObject.expirationDate });
        console.log('New organisation created');
    }
    catch (error) {
        console.log(error);
        return res.status(403).json(error);
    }
});
exports.default = router;
