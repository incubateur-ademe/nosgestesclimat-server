"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const authentificationMiddleware_1 = require("../../middlewares/authentificationMiddleware");
const router = express_1.default.Router();
/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router
    .use(authentificationMiddleware_1.authentificationMiddleware)
    .post('/', async (req, res) => {
    const email = req.body.email;
    if (!email) {
        return res.status(403).json('No owner email provided.');
    }
    try {
        const organisationFound = await OrganisationSchema_1.Organisation.findOne({
            'administrators.email': email,
        }).populate('polls');
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(organisationFound);
    }
    catch (error) {
        res.status(403).json('No organisation found.');
    }
});
exports.default = router;
