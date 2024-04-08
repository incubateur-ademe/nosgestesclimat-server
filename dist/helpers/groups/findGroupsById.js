"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGroupsById = void 0;
const GroupSchema_1 = require("../../schemas/GroupSchema");
async function findGroupsById(ids) {
    if (!ids) {
        return Promise.resolve([]);
    }
    return await GroupSchema_1.Group.find({
        _id: { $in: ids },
    });
}
exports.findGroupsById = findGroupsById;
