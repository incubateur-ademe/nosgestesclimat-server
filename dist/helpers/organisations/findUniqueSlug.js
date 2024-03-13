"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUniqueSlug = void 0;
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
async function findUniqueSlug(orgaSlug, counter = 0) {
    const organisationFound = await OrganisationSchema_1.Organisation.findOne({
        slug: counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`,
    });
    if (organisationFound) {
        return findUniqueSlug(orgaSlug, counter + 1);
    }
    return counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`;
}
exports.findUniqueSlug = findUniqueSlug;
