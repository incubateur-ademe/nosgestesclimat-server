"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeResults = exports.safeGetSituation = void 0;
const co2_model_FR_lang_fr_json_1 = __importDefault(require("@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json"));
const publicodes_1 = __importDefault(require("publicodes"));
const safeGetSituation = ({ situation, everyRules, }) => {
    const unsupportedDottedNamesFromSituation = Object.keys(situation).filter((ruleName) => {
        // We check if the dotteName is a rule of the model
        if (!everyRules.includes(ruleName)) {
            const error = new Error(`error trying to use "${ruleName}" from the user situation: the rule doesn't exist in the model`);
            console.warn(error);
            return true;
        }
        // We check if the value from a mutliple choices question `dottedName`
        // is defined as a rule `dottedName . value` in the model.
        // If not, the value in the situation is an old option, that is not an option anymore.
        if (typeof situation[ruleName] === 'string' &&
            situation[ruleName] !== 'oui' &&
            situation[ruleName] !== 'non' &&
            !everyRules.includes(`${ruleName} . ${situation[ruleName]?.replaceAll(/^'|'$/g, '')}`)) {
            const error = new Error(`error trying to use "${ruleName}" answer from the user situation: "${situation[ruleName]}" doesn't exist in the model`);
            console.warn(error);
            return false;
        }
        return false;
    });
    const filteredSituation = { ...situation };
    unsupportedDottedNamesFromSituation.map((ruleName) => {
        // If a dottedName is not supported in the model, it is dropped from the situation.
        delete filteredSituation[ruleName];
    });
    return filteredSituation;
};
exports.safeGetSituation = safeGetSituation;
function computeResults(situation) {
    const engine = new publicodes_1.default(co2_model_FR_lang_fr_json_1.default);
    const safeSituation = (0, exports.safeGetSituation)({
        situation,
        everyRules: Object.keys(co2_model_FR_lang_fr_json_1.default),
    });
    engine.setSituation(safeSituation);
    return {
        bilan: Number(engine.evaluate('bilan').nodeValue),
        categories: {
            transport: Number(engine.evaluate('transport').nodeValue),
            alimentation: Number(engine.evaluate('alimentation').nodeValue),
            logement: Number(engine.evaluate('logement').nodeValue),
            divers: Number(engine.evaluate('divers').nodeValue),
            'services sociétaux': Number(engine.evaluate('services sociétaux').nodeValue),
        },
    };
}
exports.computeResults = computeResults;
