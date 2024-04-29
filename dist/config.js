"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const os_1 = require("./utils/os");
if (process.env.NODE_ENV === 'development') {
    require('dotenv').config();
}
exports.config = {
    env: (0, os_1.ensureEnvVar)(process.env.NODE_ENV, 'development'),
    get app() {
        const parentConfig = this;
        return {
            get port() {
                return (0, os_1.ensureEnvVar)(process.env.PORT, Number, parentConfig.env === 'development' ? 3001 : 3000);
            },
        };
    },
    security: {
        jwt: {
            secret: (0, os_1.ensureEnvVar)(process.env.JWT_SECRET, ''),
        },
    },
    thirdParty: {
        brevo: {
            apiKey: (0, os_1.ensureEnvVar)(process.env.BREVO_API_KEY, ''),
        },
        matomo: {
            url: (0, os_1.ensureEnvVar)(process.env.MATOMO_URL, 'https://stats.data.gouv.fr'),
            token: (0, os_1.ensureEnvVar)(process.env.MATOMO_TOKEN, ''),
        },
    },
    mongo: {
        url: (0, os_1.ensureEnvVar)(process.env.MONGO_URL, 'mongodb://127.0.0.1:27017/dev'),
    },
};
