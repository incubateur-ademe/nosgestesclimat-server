"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsDriver = void 0;
const formatDottedName_1 = require("../../../utils/formatDottedName");
const VOITURE_KM_DOTTEDNAME = 'transport . voiture . km';
function getIsDriver({ situation }) {
    if (!situation) {
        return false;
    }
    // If question is skipped
    if (situation && !situation[(0, formatDottedName_1.formatDottedName)(VOITURE_KM_DOTTEDNAME)]) {
        return true;
    }
    return situation[(0, formatDottedName_1.formatDottedName)(VOITURE_KM_DOTTEDNAME)] > 0;
}
exports.getIsDriver = getIsDriver;
