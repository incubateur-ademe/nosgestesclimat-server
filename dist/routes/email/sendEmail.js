"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const sendEmail_1 = require("../../helpers/email/sendEmail");
const router = express_1.default.Router();
/**
 * Send a email using the Brevo API
 * It requires a email, a templateId, params and attributes
 * It returns the created group
 */
router.route('/').post(async (req, res) => {
    const email = req.body.email;
    const templateId = req.body.templateId;
    const params = req.body.params;
    const attributes = req.body.attributes;
    // Check if all required fields are provided
    if (!email) {
        return res.status(500).send('Error. An email must be provided.');
    }
    if (!templateId) {
        return res.status(500).send('Error. A templateId must be provided.');
    }
    try {
        await (0, sendEmail_1.sendEmail)({ email, templateId, params, attributes });
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        return res.send('Email sent successfully');
    }
    catch (error) {
        console.log(error);
        return res.status(500).send('Error sending email: ' + error);
    }
});
exports.default = router;
