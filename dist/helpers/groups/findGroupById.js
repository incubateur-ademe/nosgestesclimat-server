"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGroupById = void 0;
const GroupSchema_1 = require("../../schemas/GroupSchema");
function findGroupById(id) {
    if (!id) {
        return null;
    }
    return GroupSchema_1.Group.findOne({ _id: id });
}
exports.findGroupById = findGroupById;
