"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPopulatedPollBySlug = void 0;
const PollSchema_1 = require("../../schemas/PollSchema");
function findPopulatedPollBySlug(slug) {
    if (!slug) {
        return null;
    }
    return PollSchema_1.Poll.findOne({ slug }).populate({
        path: 'simulations',
        populate: {
            path: 'user',
        },
    });
}
exports.findPopulatedPollBySlug = findPopulatedPollBySlug;
