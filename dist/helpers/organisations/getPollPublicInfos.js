"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollPublicInfos = void 0;
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const findPollBySlug_1 = require("./findPollBySlug");
async function getPollPublicInfos({ pollSlug, }) {
    const poll = await (0, findPollBySlug_1.findPollBySlug)(pollSlug);
    if (!poll) {
        return null;
    }
    const organisation = await OrganisationSchema_1.Organisation.findOne({
        polls: poll._id,
    });
    if (!organisation) {
        return null;
    }
    const pollPublicInfos = {
        name: poll.slug,
        slug: poll.slug,
        defaultAdditionalQuestions: poll.defaultAdditionalQuestions,
        expectedNumberOfParticipants: poll.expectedNumberOfParticipants,
        numberOfParticipants: poll.simulations.length,
        organisationInfo: {
            name: organisation.name,
            slug: organisation.slug,
        },
    };
    return pollPublicInfos;
}
exports.getPollPublicInfos = getPollPublicInfos;
