"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setSuccessfulResponse_1 = require("../../utils/setSuccessfulResponse");
const cookies_1 = require("../../constants/cookies");
const router = express_1.default.Router();
router
    .use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    // -1 setting up request as expired and re-requesting before display again.
    res.header('Expires', '-1');
    res.clearCookie('ngcjwt', cookies_1.COOKIES_OPTIONS);
    res.cookie('ngcjwt', '', cookies_1.COOKIES_OPTIONS);
    next();
})
    .route('/')
    .post((req, res) => {
    try {
        (0, setSuccessfulResponse_1.setSuccessfulJSONResponse)(res);
        res.json('Logged out');
    }
    catch (error) {
        return res.status(403).json(error);
    }
});
exports.default = router;
