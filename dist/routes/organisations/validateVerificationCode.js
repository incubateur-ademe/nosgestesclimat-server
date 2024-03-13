"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const VerificationCodeSchema_1 = require("../../schemas/VerificationCodeSchema");
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const config_1 = require("../../config");
const cookies_1 = require("../../constants/cookies");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    const email = req.body.email;
    const verificationCode = req.body.verificationCode;
    if (!email || !verificationCode) {
        return res.status(403).json('No email or verification code provided.');
    }
    try {
        const verificationCodeFound = await VerificationCodeSchema_1.VerificationCode.findOne({
            email,
        }, {}, { sort: { createdAt: -1 } });
        if (!verificationCodeFound) {
            return res.status(403).json('No matching verification code found.');
        }
        // Validation of the code
        const now = new Date();
        if (verificationCodeFound.toObject().code !== verificationCode) {
            return res.status(403).json('Invalid code.');
        }
        if (verificationCodeFound.toObject().expirationDate.getTime() < now.getTime()) {
            return res.status(403).json('Code expired.');
        }
        const token = jsonwebtoken_1.default.sign({ email }, config_1.config.security.jwt.secret, {
            expiresIn: cookies_1.COOKIE_MAX_AGE,
        });
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.cookie('ngcjwt', token, cookies_1.COOKIES_OPTIONS);
        const organisation = await OrganisationSchema_1.Organisation.findOne({
            'administrators.email': email,
        });
        res.json(organisation);
    }
    catch (error) {
        console.log('error', error);
        return res.status(403).json(error);
    }
});
exports.default = router;
