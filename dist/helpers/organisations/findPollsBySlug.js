"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPollsBySlug = void 0;
const PollSchema_1 = require("../../schemas/PollSchema");
async function findPollsBySlug(slugs) {
    if (!slugs) {
        return Promise.resolve([]);
    }
    return await PollSchema_1.Poll.find({
        slug: { $in: slugs },
    });
}
exports.findPollsBySlug = findPollsBySlug;
