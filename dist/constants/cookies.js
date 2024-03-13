"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIES_OPTIONS = exports.COOKIE_MAX_AGE = void 0;
const config_1 = require("../config");
exports.COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 61; // 2 months
exports.COOKIES_OPTIONS = {
    maxAge: exports.COOKIE_MAX_AGE,
    httpOnly: true,
    secure: config_1.config.env === 'production',
    sameSite: config_1.config.env === 'production' ? 'none' : 'lax',
};
