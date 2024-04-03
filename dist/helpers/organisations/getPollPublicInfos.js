"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollPublicInfos = void 0;
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const findPollsBySlug_1 = require("./findPollsBySlug");
async function getPollPublicInfos({ pollSlug, }) {
    const polls = await (0, findPollsBySlug_1.findPollsBySlug)([pollSlug]);
    const poll = polls[0];
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
