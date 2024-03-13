"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const handleSendVerificationCodeAndReturnExpirationDate_1 = require("../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate");
const router = express_1.default.Router();
router.route('/').post(async (req, res) => {
    try {
        const email = req.body.email;
        const organisationFound = await OrganisationSchema_1.Organisation.findOne({
            administrators: { $elemMatch: { email } },
        });
        if (!organisationFound) {
            return res.status(403).json('No matching organisation found.');
        }
        const verificationCodeObject = await (0, handleSendVerificationCodeAndReturnExpirationDate_1.handleSendVerificationCodeAndReturnExpirationDate)(email);
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json({
            expirationDate: verificationCodeObject.expirationDate,
        });
        console.log('Login attempt, sent verification code.');
    }
    catch (error) {
        return res.status(403).json('No organisation found.');
    }
});
exports.default = router;
