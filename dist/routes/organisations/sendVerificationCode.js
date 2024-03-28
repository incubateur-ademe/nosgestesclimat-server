"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const handleSendVerificationCodeAndReturnExpirationDate_1 = require("../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    const email = req.body.email;
    if (!email) {
        return res.status(403).json('No owner email provided.');
    }
    try {
        const organisationFound = await OrganisationSchema_1.Organisation.findOne({
            'administrators.email': email,
        });
        if (!organisationFound) {
            return res.status(403).json('No matching organisation found.');
        }
        const verificationCodeObject = await (0, handleSendVerificationCodeAndReturnExpirationDate_1.handleSendVerificationCodeAndReturnExpirationDate)({ email });
        organisationFound.administrators[0].verificationCode =
            verificationCodeObject;
        await organisationFound.save();
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json({
            expirationDate: verificationCodeObject.expirationDate,
        });
        console.log('Verification code sent.');
    }
    catch (error) {
        return res.status(403).json("Une erreur s'est produite.");
    }
});
exports.default = router;
