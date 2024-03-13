"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
router.route('/').post(async (req, res) => {
    const simulationId = req.body.simulationId;
    if (!simulationId) {
        return res
            .status(404)
            .send('Error. A simulation id or an email must be provided.');
    }
    const objectId = new mongoose_1.default.Types.ObjectId(simulationId);
    try {
        const simulationFound = await SimulationSchema_1.Simulation.collection.findOne({
            $or: [{ _id: objectId }, { id: simulationId }],
        });
        if (!simulationFound) {
            return res.status(404).send('No matching simulation found.');
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(simulationFound);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('Error while fetching simulation.');
    }
});
exports.default = router;
