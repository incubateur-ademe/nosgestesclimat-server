"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSuccessfulJSONResponse = void 0;
const setSuccessfulJSONResponse = (response) => {
    response.setHeader('Content-Type', 'application/json');
    response.statusCode = 200;
};
exports.setSuccessfulJSONResponse = setSuccessfulJSONResponse;
