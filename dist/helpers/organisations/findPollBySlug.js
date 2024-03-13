"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPollBySlug = void 0;
const PollSchema_1 = require("../../schemas/PollSchema");
function findPollBySlug(slug) {
    if (!slug) {
        return null;
    }
    return PollSchema_1.Poll.findOne({ slug });
}
exports.findPollBySlug = findPollBySlug;
