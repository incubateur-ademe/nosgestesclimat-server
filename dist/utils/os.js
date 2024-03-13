"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureEnvVar = exports.sleep = void 0;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
exports.sleep = sleep;
const ensureEnvVar_ = (envVar, transformerOrDefaultValue, defaultValue) => {
    const defaultValueToTest = typeof transformerOrDefaultValue !== 'function'
        ? transformerOrDefaultValue
        : defaultValue;
    if (typeof envVar === 'undefined' &&
        typeof defaultValueToTest === 'undefined') {
        throw new Error(`Some env var are not found.`, {
            cause: { envVar, transformerOrDefaultValue, defaultValue },
        });
    }
    if (typeof envVar === 'undefined' && typeof defaultValue !== 'undefined')
        return defaultValue;
    if (typeof transformerOrDefaultValue === 'function') {
        return transformerOrDefaultValue(envVar) ?? envVar ?? defaultValue;
    }
    return envVar ?? transformerOrDefaultValue;
};
// TODO use "satisfies"
exports.ensureEnvVar = ensureEnvVar_;
