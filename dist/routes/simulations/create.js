"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const createOrUpdateUser_1 = require("../../helpers/queries/createOrUpdateUser");
const findPollBySlug_1 = require("../../helpers/organisations/findPollBySlug");
const findGroupById_1 = require("../../helpers/groups/findGroupById");
const createOrUpdateSimulation_1 = require("../../helpers/queries/createOrUpdateSimulation");
const handleUpdatePoll_1 = require("../../helpers/organisations/handleUpdatePoll");
const handleUpdateGroup_1 = require("../../helpers/groups/handleUpdateGroup");
const sendSimulationEmail_1 = require("../../helpers/email/sendSimulationEmail");
const router = express_1.default.Router();
router.route('/').post(async (req, res) => {
    const simulation = req.body.simulation;
    const name = req.body.name;
    const email = req.body.email;
    const userId = req.body.userId;
    const shouldSendSimulationEmail = req.body.shouldSendSimulationEmail;
    // We need the origin to send the group email (if applicable) with the correct links
    const origin = req.get('origin') ?? 'https://nosgestesclimat.fr';
    // If no simulation is provided, we return an error
    if (!simulation) {
        return res.status(500).send('Error. A simulation must be provided.');
    }
    // We create or search for the user
    const userDocument = await (0, createOrUpdateUser_1.createOrUpdateUser)({
        email,
        name,
        userId,
    });
    // If there is no user found or created, we return an error
    if (!userDocument) {
        return res
            .status(500)
            .send('Error while creating or searching for the user.');
    }
    try {
        // We check if a poll is associated with the simulation
        const poll = await (0, findPollBySlug_1.findPollBySlug)(simulation.poll);
        // We check if a group is associated with the simulation
        const group = await (0, findGroupById_1.findGroupById)(simulation.group);
        const simulationObject = {
            id: simulation.id,
            user: userDocument._id,
            actionChoices: simulation.actionChoices,
            date: simulation.date,
            foldedSteps: simulation.foldedSteps,
            situation: simulation.situation,
            computedResults: simulation.computedResults,
            progression: simulation.progression,
            poll: poll?._id,
            group: simulation.group,
            defaultAdditionalQuestionsAnswers: simulation.defaultAdditionalQuestionsAnswers,
        };
        // We create or update the simulation
        const simulationSaved = await (0, createOrUpdateSimulation_1.createOrUpdateSimulation)(simulationObject);
        // If a poll is associated with the simulation and the simulation is not already in it
        // we add or update the simulation to the poll
        await (0, handleUpdatePoll_1.handleUpdatePoll)({
            poll,
            simulationSaved,
            email,
        });
        // If a group is associated with the simulation and the simulation is not already in it
        // we add the simulation to the group (and send an email to the user)
        await (0, handleUpdateGroup_1.handleUpdateGroup)({
            group,
            userDocument,
            simulationSaved,
            origin,
        });
        await (0, sendSimulationEmail_1.sendSimulationEmail)({
            userDocument,
            simulationSaved,
            shouldSendSimulationEmail,
            origin,
        });
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json(simulationSaved);
        console.log(`Simulation created: ${simulationSaved._id}`);
    }
    catch (error) {
        return res.status(401).send('Error while creating simulation.');
    }
});
exports.default = router;
