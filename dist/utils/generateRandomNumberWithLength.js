"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomNumberWithLength = void 0;
function generateRandomNumberWithLength(length) {
    return Math.floor(Math.pow(10, length - 1) +
        Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1));
}
exports.generateRandomNumberWithLength = generateRandomNumberWithLength;
