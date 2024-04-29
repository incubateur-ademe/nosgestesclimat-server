"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsVegetarian = void 0;
const formatDottedName_1 = require("../../../utils/formatDottedName");
const POISSON_GRAS_DOTTEDNAME = 'alimentation . plats . poisson gras . nombre';
const POISSON_BLANC_DOTTEDNAME = 'alimentation . plats . poisson blanc . nombre';
const VIANDE_ROUGE_DOTTEDNAME = 'alimentation . plats . viande rouge . nombre';
const VIANDE_BLANCHE_DOTTEDNAME = 'alimentation . plats . viande blanche . nombre';
const VEGETARIEN_DOTTEDNAME = 'alimentation . plats . végétarien . nombre';
const VEGETALIEN_DOTTEDNAME = 'alimentation . plats . végétalien . nombre';
function eatsViandeRouge({ situation }) {
    return (situation[(0, formatDottedName_1.formatDottedName)(VIANDE_ROUGE_DOTTEDNAME)] === undefined ||
        situation[(0, formatDottedName_1.formatDottedName)(VIANDE_ROUGE_DOTTEDNAME)] > 0);
}
function eatsViandeBlanche({ situation }) {
    return (situation[(0, formatDottedName_1.formatDottedName)(VIANDE_BLANCHE_DOTTEDNAME)] === undefined ||
        parseInt(situation[(0, formatDottedName_1.formatDottedName)(VIANDE_BLANCHE_DOTTEDNAME)]) >
            0);
}
function eatsPoissonGras({ situation }) {
    return (situation[(0, formatDottedName_1.formatDottedName)(POISSON_GRAS_DOTTEDNAME)] === undefined ||
        parseInt(situation[(0, formatDottedName_1.formatDottedName)(POISSON_GRAS_DOTTEDNAME)]) > 0);
}
function eatsPoissonBlanc({ situation }) {
    return (situation[(0, formatDottedName_1.formatDottedName)(POISSON_BLANC_DOTTEDNAME)] === undefined ||
        parseInt(situation[(0, formatDottedName_1.formatDottedName)(POISSON_BLANC_DOTTEDNAME)]) >
            0);
}
function getIsVegetarian({ situation }) {
    if (!situation) {
        return false;
    }
    // If question is skipped
    if (situation &&
        !situation[(0, formatDottedName_1.formatDottedName)(VIANDE_ROUGE_DOTTEDNAME)] &&
        !situation[(0, formatDottedName_1.formatDottedName)(VIANDE_BLANCHE_DOTTEDNAME)] &&
        !situation[(0, formatDottedName_1.formatDottedName)(POISSON_GRAS_DOTTEDNAME)] &&
        !situation[(0, formatDottedName_1.formatDottedName)(POISSON_BLANC_DOTTEDNAME)] &&
        !situation[(0, formatDottedName_1.formatDottedName)(VEGETARIEN_DOTTEDNAME)] &&
        !situation[(0, formatDottedName_1.formatDottedName)(VEGETALIEN_DOTTEDNAME)]) {
        return false;
    }
    return (!eatsViandeRouge({ situation }) &&
        !eatsViandeBlanche({ situation }) &&
        !eatsPoissonGras({ situation }) &&
        !eatsPoissonBlanc({ situation }));
}
exports.getIsVegetarian = getIsVegetarian;
