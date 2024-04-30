"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsBicycleUser = void 0;
const formatDottedName_1 = require("../../../utils/formatDottedName");
const VELO_DOTTEDNAME = 'transport . mobilité douce . vélo . présent';
const VAE_DOTTEDNAME = 'transport . mobilité douce . vae . présent';
function getIsBicycleUser({ situation }) {
    if (!situation) {
        return false;
    }
    // If question is skipped
    if (situation &&
        !situation[(0, formatDottedName_1.formatDottedName)(VELO_DOTTEDNAME)] &&
        !situation[(0, formatDottedName_1.formatDottedName)(VAE_DOTTEDNAME)]) {
        return false;
    }
    return (situation[(0, formatDottedName_1.formatDottedName)(VELO_DOTTEDNAME)] === 'oui' ||
        situation[(0, formatDottedName_1.formatDottedName)(VAE_DOTTEDNAME)] === 'oui');
}
exports.getIsBicycleUser = getIsBicycleUser;
