"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const EmailSimulationSchema_1 = __importDefault(require("../../schemas/_legacy/EmailSimulationSchema"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const router = express_1.default.Router();
router
    .route('/:id?')
    .get(async (req, res) => {
    if (!req.params.id) {
        return res.status(404).send('You must provide a simulation id');
    }
    let objectId;
    try {
        objectId = new mongoose_1.default.Types.ObjectId(req.params.id);
    }
    catch (error) {
        return res.status(404).send('This id is not valid');
    }
    try {
        const simulation = await EmailSimulationSchema_1.default.findOne({
            _id: objectId,
        });
        if (!simulation) {
            return res.status(404).send('This simulation does not exist');
        }
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(simulation);
    }
    catch (error) {
        return res.status(500).send('Error while fetching simulation');
    }
});
exports.default = router;
