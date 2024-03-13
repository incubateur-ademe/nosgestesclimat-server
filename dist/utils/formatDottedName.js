"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unformatDottedName = exports.formatDottedName = void 0;
function formatDottedName(dottedName) {
    return dottedName.replaceAll(' . ', '_').replaceAll(' ', '-');
}
exports.formatDottedName = formatDottedName;
function unformatDottedName(dottedName) {
    return dottedName.replaceAll('_', ' . ').replaceAll('-', ' ');
}
exports.unformatDottedName = unformatDottedName;
