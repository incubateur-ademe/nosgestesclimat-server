"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const initDatabase_1 = __importDefault(require("../../scripts/initDatabase"));
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
const router = express_1.default.Router();
router.route('/').get((req, res, next) => {
    initDatabase_1.default.then(() => {
        const data = SimulationSchema_1.Simulation.find({});
        data.then((simulations) => {
            if (!simulations.length) {
                return res.status(404).send('No ratings found');
            }
            const ratings = simulations
                // @ts-ignore
                .map(({ data, updatedAt, createdAt }) => ({
                ratings: data?.ratings,
                createdAt,
                updatedAt,
            }))
                .filter((d) => d.ratings);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.json(ratings);
        });
    });
});
exports.default = router;
