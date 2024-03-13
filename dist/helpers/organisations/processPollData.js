"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPollData = void 0;
const formatDottedName_1 = require("../../utils/formatDottedName");
function getIsBicycleUser({ situation }) {
    if (!situation) {
        return false;
    }
    // If question is skipped
    if (situation &&
        !situation[(0, formatDottedName_1.formatDottedName)('transport . mobilité douce . vélo . présent')] &&
        !situation[(0, formatDottedName_1.formatDottedName)('transport . mobilité douce . vae . présent')]) {
        return false;
    }
    return (situation[(0, formatDottedName_1.formatDottedName)('transport . mobilité douce . vélo . présent')] === 'oui' ||
        situation[(0, formatDottedName_1.formatDottedName)('transport . mobilité douce . vae . présent')] === 'oui');
}
function getIsVegetarian({ situation }) {
    if (!situation) {
        return false;
    }
    // If question is skipped
    if (situation &&
        !situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . viande 1 . nombre')] &&
        !situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . viande 2 . nombre')] &&
        !situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . poisson 1 . nombre')] &&
        !situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . poisson 2 . nombre')] &&
        !situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . végétarien . nombre')] &&
        !situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . végétalien . nombre')]) {
        return false;
    }
    return (situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . viande 1 . nombre')] ===
        0 &&
        situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . viande 2 . nombre')] ===
            0 &&
        situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . poisson 1 . nombre')] ===
            0 &&
        situation[(0, formatDottedName_1.formatDottedName)('alimentation . plats . poisson 2 . nombre')] ===
            0);
}
function getIsDriver({ situation }) {
    if (!situation) {
        return false;
    }
    // If question is skipped
    if (situation && !situation[(0, formatDottedName_1.formatDottedName)('transport . voiture . km')]) {
        return true;
    }
    return situation[(0, formatDottedName_1.formatDottedName)('transport . voiture . km')] > 0;
}
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
        if (getIsBicycleUser({ situation: simulation.situation })) {
            numberOfBicycleUsers += 1;
        }
        if (getIsVegetarian({ situation: simulation.situation })) {
            numberOfVegetarians += 1;
        }
        if (getIsDriver({ situation: simulation.situation })) {
            numberOfCarOwners += 1;
        }
        return {
            bilan: simulation.computedResults.bilan,
            categories: simulation.computedResults.categories,
            defaultAdditionalQuestionsAnswers: simulation.defaultAdditionalQuestionsAnswers ?? {},
            progression: simulation.progression,
            isCurrentUser: simulation.user?.userId === userId,
            date: simulation.modifiedAt,
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
