"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const axios_1 = __importDefault(require("axios"));
const axios_2 = require("../../constants/axios");
const getContactLists_1 = require("../../helpers/brevo/getContactLists");
const createOrUpdateUser_1 = require("../../helpers/queries/createOrUpdateUser");
const createOrUpdateContact_1 = require("../../helpers/email/createOrUpdateContact");
const router = express_1.default.Router();
/**
 * Updates the user and newsletter settings
 */
router.route('/').post(async (req, res) => {
    const email = req.body.email;
    const userId = req.body.userId;
    const newsletterIds = req.body.newsletterIds;
    const name = req.body.name;
    // Check if all required fields are provided
    if (!email && !userId) {
        return res.status(500).send('Error. An email or a userId must be provided.');
    }
    try {
        if (newsletterIds) {
            let currentListIds;
            try {
                currentListIds = await (0, getContactLists_1.getContactLists)(email);
            }
            catch (e) {
                // The contact does not exist in Brevo
                currentListIds = [];
            }
            const listsAdded = [];
            const listsRemoved = [];
            Object.entries(newsletterIds).forEach(([key, shouldBeInList]) => {
                const keyAsNumber = parseInt(key);
                // List id should be added
                if (shouldBeInList && !currentListIds?.includes(keyAsNumber)) {
                    listsAdded.push(keyAsNumber);
                }
                // List id should be removed
                if (!shouldBeInList && currentListIds?.includes(keyAsNumber)) {
                    listsRemoved.push(keyAsNumber);
                }
            });
            const updates = {};
            if (name)
                updates.name = name;
            if (listsAdded.length > 0)
                updates.listIds = listsAdded;
            // Update Brevo contact
            if (name || listsAdded.length > 0) {
                await (0, createOrUpdateContact_1.createOrUpdateContact)({ email, ...updates });
            }
            // Update DB User document
            if (name) {
                await (0, createOrUpdateUser_1.createOrUpdateUser)({ userId, email, name });
            }
            // We need to use a specific endpoint to remove contacts from lists
            if (listsRemoved.length > 0) {
                for (let listId of listsRemoved) {
                    await axios_1.default.post(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts/remove`, {
                        emails: [email],
                    }, axios_2.axiosConf);
                }
            }
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        return res.send('Settings successfully updated.');
    }
    catch (error) {
        return res.status(500).send('Error updating settings: ' + error);
    }
});
exports.default = router;
