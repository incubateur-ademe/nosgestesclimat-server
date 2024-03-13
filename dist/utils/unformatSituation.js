"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unformatSituation = void 0;
function unformatSituation(situation) {
    return Object.entries({ ...situation }).reduce((acc, [key, value]) => {
        acc[key.replaceAll(' . ', '_').replaceAll(' ', '-')] = value;
        return acc;
    }, {});
}
exports.unformatSituation = unformatSituation;
