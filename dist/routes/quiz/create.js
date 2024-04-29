"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const QuizSchema_1 = require("../../schemas/QuizSchema");
const router = express_1.default.Router();
/**
 * Create a new quiz answer
 * It requires a simulationId, an answer, and isAnswerCorrect (can be 'correct', 'almost' or 'wrong')
 * It returns the id of the answer
 */
router.route('/').post(async (req, res) => {
    const simulationId = req.body.simulationId;
    const answer = req.body.answer;
    const isAnswerCorrect = req.body.isAnswerCorrect;
    // If no simulationId, answer or isAnswerCorrect is provided, we return an error
    if (!simulationId) {
        return res.status(500).send('Error. A simulationId must be provided.');
    }
    if (!answer) {
        return res.status(500).send('Error. An answer must be provided.');
    }
    if (!isAnswerCorrect) {
        return res.status(500).send('Error. isAnswerCorrect must be provided.');
    }
    try {
        // We create and save a new quiz answer
        const quizAnswer = new QuizSchema_1.QuizAnswer({
            answer,
            isAnswerCorrect,
            simulationId,
        });
        await quizAnswer.save();
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(quizAnswer);
        console.log(`Quiz answer created: ${quizAnswer._id}`);
    }
    catch (error) {
        return res.status(500).send('Error while creating quiz answer.');
    }
});
exports.default = router;
