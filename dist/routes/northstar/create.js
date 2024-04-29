"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const NorthstarSchema_1 = require("../../schemas/NorthstarSchema");
const router = express_1.default.Router();
/**
 * Create a new northstar rating
 * It requires a simulationId, a value, and a type
 * It returns the rating object
 */
router.route('/').post(async (req, res) => {
    const simulationId = req.body.simulationId;
    const value = req.body.value;
    const type = req.body.type;
    // If no simulationId, value or type is provided, we return an error
    if (!simulationId) {
        return res.status(500).send('Error. A simulationId must be provided.');
    }
    if (!value) {
        return res.status(500).send('Error. A value must be provided.');
    }
    if (!type) {
        return res.status(500).send('Error. A type must be provided.');
    }
    try {
        // We create and save a new northstar value
        const northstarRating = new NorthstarSchema_1.NorthstarRating({
            value,
            type,
            simulationId,
        });
        await northstarRating.save();
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(northstarRating);
        console.log(`Northstar rating created: ${northstarRating._id}`);
    }
    catch (error) {
        return res.status(500).send('Error while creating northstar value.');
    }
});
exports.default = router;
