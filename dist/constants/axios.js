"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.axiosConf = void 0;
const config_1 = require("../config");
exports.axiosConf = {
    headers: {
        'api-key': config_1.config.thirdParty.brevo.apiKey,
    },
};
