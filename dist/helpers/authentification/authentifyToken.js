"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("../../config");
dotenv_1.default.config();
function authenticateToken({ req, res, email }) {
    const cookiesHeader = req.headers.cookie;
    const token = cookiesHeader && cookiesHeader.split('ngcjwt=')?.[1]?.split(';')?.[0];
    if (!token) {
        throw Error('No token provided.');
    }
    jsonwebtoken_1.default.verify(token, config_1.config.security.jwt.secret, (err, result) => {
        const emailDecoded = result?.email;
        if (err || email !== emailDecoded) {
            throw new Error('Invalid token');
        }
        // Generate a new token
        const newToken = jsonwebtoken_1.default.sign({ email }, config_1.config.security.jwt.secret, {
            expiresIn: '1h',
        });
        res.cookie('ngcjwt', newToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            secure: config_1.config.env === 'production',
            sameSite: 'none',
        });
    });
}
exports.authenticateToken = authenticateToken;
