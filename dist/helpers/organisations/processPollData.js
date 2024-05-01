"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPollData = void 0;
const getIsBicycleUser_1 = require("./processPollData/getIsBicycleUser");
const getIsVegetarien_1 = require("./processPollData/getIsVegetarien");
const getIsDriver_1 = require("./processPollData/getIsDriver");
function processPollData({ simulations, userId, }) {
    if (!simulations.length) {
        return {
            funFacts: {
                percentageOfBicycleUsers: 0,
                percentageOfVegetarians: 0,
                percentageOfCarOwners: 0,
            },
            simulationRecaps: [],
        };
    }
    // Condition: "oui" to transport.mobilité_douce.vélo ou transport.mobilité_douce.vae
    let numberOfBicycleUsers = 0;
    // Condition: has only vegeterian and vegan meals
    let numberOfVegetarians = 0;
    // Condition: "oui" to transport.voiture.propriétaire
    let numberOfCarOwners = 0;
    // Pour chaque simulation du sondage
    const simulationRecaps = simulations.map((simulation) => {
        // We get the value for each fun fact
        if ((0, getIsBicycleUser_1.getIsBicycleUser)({ situation: simulation.situation })) {
            numberOfBicycleUsers += 1;
        }
        if ((0, getIsVegetarien_1.getIsVegetarian)({ situation: simulation.situation })) {
            numberOfVegetarians += 1;
        }
        if ((0, getIsDriver_1.getIsDriver)({ situation: simulation.situation })) {
            numberOfCarOwners += 1;
        }
        return {
            bilan: simulation.computedResults.bilan,
            categories: { ...(simulation.computedResults.categories ?? {}) },
            defaultAdditionalQuestionsAnswers: {
                ...(simulation.defaultAdditionalQuestionsAnswers ?? {}),
            },
            progression: simulation.progression,
            isCurrentUser: simulation.user?.userId === userId,
            date: simulation.modifiedAt ? new Date(simulation.modifiedAt) : undefined,
        };
    });
    return {
        funFacts: {
            percentageOfBicycleUsers: (numberOfBicycleUsers / simulations.length) * 100,
            percentageOfVegetarians: (numberOfVegetarians / simulations.length) * 100,
            percentageOfCarOwners: (numberOfCarOwners / simulations.length) * 100,
        },
        simulationRecaps,
    };
}
exports.processPollData = processPollData;
