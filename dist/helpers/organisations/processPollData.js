"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPollData = void 0;
const co2_model_FR_lang_fr_json_1 = __importDefault(require("@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json"));
const funFactsRules_json_1 = __importDefault(require("@incubateur-ademe/nosgestesclimat/public/funFactsRules.json"));
const processCondition_1 = require("./processPollData/processCondition");
const processFunFactsValues_1 = require("./processPollData/processFunFactsValues");
// This is shit but a hack from our lead dev
const rules = co2_model_FR_lang_fr_json_1.default;
const funFactsRules = funFactsRules_json_1.default;
function processPollData({ simulations, userId, }) {
    // Is there a way to generate it dynamically ?
    let computedFunFacts = {
        percentageOfBicycleUsers: 0,
        percentageOfVegetarians: 0,
        percentageOfCarOwners: 0,
        percentageOfPlaneUsers: 0,
        percentageOfLongPlaneUsers: 0,
        averageOfCarKilometers: 0,
        averageOfTravelers: 0,
        percentageOfElectricHeating: 0,
        percentageOfGasHeating: 0,
        percentageOfFuelHeating: 0,
        percentageOfWoodHeating: 0,
        averageOfElectricityConsumption: 0,
        percentageOfCoolingSystem: 0,
        percentageOfVegan: 0,
        percentageOfRedMeat: 0,
        percentageOfLocalAndSeasonal: 0,
        percentageOfBottledWater: 0,
        percentageOfZeroWaste: 0,
        amountOfClothing: 0,
        percentageOfStreaming: 0,
    };
    if (!simulations.length) {
        return {
            funFacts: computedFunFacts,
            simulationRecaps: [],
        };
    }
    // Pour chaque simulation du sondage
    const simulationRecaps = simulations.map((simulation) => {
        Object.entries(funFactsRules).forEach(([key, dottedName]) => {
            if (!Object.keys(rules).includes(dottedName)) {
                throw new Error(`${dottedName} not found in rules`);
            }
            const conditionResult = (0, processCondition_1.processCondition)({
                situation: simulation.situation,
                rule: rules[dottedName],
            });
            if (typeof conditionResult === 'boolean' && conditionResult === true) {
                computedFunFacts[key] += 1;
            }
            if (typeof conditionResult === 'number') {
                computedFunFacts[key] += conditionResult;
            }
        });
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
        funFacts: (0, processFunFactsValues_1.processFunFactsValues)({
            simulations,
            computedFunFacts,
            funFactsRules,
            rules,
        }),
        simulationRecaps,
    };
}
exports.processPollData = processPollData;
