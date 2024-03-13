"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const initDatabase_1 = __importDefault(require("../../scripts/initDatabase"));
const SurveySchema_1 = __importDefault(require("../../schemas/_legacy/SurveySchema"));
const router = express_1.default.Router();
router.route('/:room').get((req, res) => {
    if (req.params.room == null) {
        throw new Error('Unauthorized. A valid survey name must be provided');
    }
    initDatabase_1.default.then(() => {
        const data = SurveySchema_1.default.find({ name: req.params.room });
        // @ts-ignore
        data.then((survey) => {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.json(survey);
        });
    });
});
router.route('/').post(async (req, res, next) => {
    if (req.body.room == null) {
        return next('Error. A survey name must be provided');
    }
    const found = await SurveySchema_1.default.find({ name: req.body.room });
    if (found.length) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 409;
        res.json(found[0]);
        console.log('Survey exists', req.body.room);
        return;
    }
    const survey = new SurveySchema_1.default({ name: req.body.room });
    survey.save((error) => {
        if (error) {
            res.send(error);
        }
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.json(survey);
        console.log('New survey create', req.body.room);
    });
});
exports.default = router;
