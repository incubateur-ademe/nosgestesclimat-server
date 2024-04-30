"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const getContactLists_1 = require("../../helpers/brevo/getContactLists");
const router = express_1.default.Router();
/**
 * Updates the user and newsletter settings
 */
router.route('/').get(async (req, res) => {
    const email = req.query.email;
    // Check if all required fields are provided
    if (!email) {
        return res.status(500).send('Error. An email must be provided.');
    }
    try {
        const listIds = await (0, getContactLists_1.getContactLists)(email);
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        return res.json(listIds);
    }
    catch (error) {
        return res.status(500).send('Error updating settings: ' + error);
    }
});
exports.default = router;
