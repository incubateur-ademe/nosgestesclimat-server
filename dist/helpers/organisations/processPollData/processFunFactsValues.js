"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFunFactsValues = void 0;
const formatDottedName_1 = require("../../../utils/formatDottedName");
function processFunFactsValues({ simulations, computedFunFacts, funFactsRules, rules, }) {
    return Object.fromEntries(Object.entries(computedFunFacts).map(([key, value]) => {
        // This is so dirty
        if (key === 'averageOfCarKilometers' ||
            key === 'averageOfTravelers' ||
            key === 'averageOfElectricityConsumption') {
            const totalAnswers = simulations.reduce((acc, simulation) => {
                return (acc +
                    (simulation.situation[(0, formatDottedName_1.formatDottedName)(rules[funFactsRules[key]].formule.moyenne[0])]
                        ? 1
                        : 0));
            }, 0);
            return [key, value / totalAnswers];
        }
        if (key.includes('percentage')) {
            return [key, (value / simulations.length) * 100];
        }
        return [key, value];
    }));
}
exports.processFunFactsValues = processFunFactsValues;
