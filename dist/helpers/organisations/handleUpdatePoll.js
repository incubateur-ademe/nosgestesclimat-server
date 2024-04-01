"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpdatePoll = void 0;
const sendEmail_1 = require("../email/sendEmail");
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const createOrUpdateContact_1 = require("../email/createOrUpdateContact");
const brevo_1 = require("../../constants/brevo");
async function handleUpdatePoll({ poll, simulationSaved, email, }) {
    if (!poll || poll.simulations.includes(simulationSaved._id)) {
        return;
    }
    poll.simulations.push(simulationSaved._id);
    await poll.save();
    // Update number of participants on the administrators' Brevo contacts
    const organisationFound = (await OrganisationSchema_1.Organisation.findOne({
        polls: poll._id,
    }));
    if (organisationFound) {
        const administrators = organisationFound.administrators;
        for (const administrator of administrators) {
            await (0, createOrUpdateContact_1.createOrUpdateContact)({
                email: administrator.email,
                userId: administrator.userId,
                otherAttributes: {
                    [brevo_1.ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]: poll.simulations.length,
                },
            });
        }
    }
    // Send confirmation email
    if (email) {
        const organisationFound = (await OrganisationSchema_1.Organisation.findOne({
            polls: poll._id,
        }));
        await (0, sendEmail_1.sendEmail)({
            email,
            templateId: 71,
            params: {
                ORGANISATION_NAME: organisationFound?.name ?? '',
                DETAILED_VIEW_URL: `https://nosgestesclimat.fr/organisations/${organisationFound?.slug}/resultats-detailles`,
            },
        });
    }
    console.log(`Simulation saved in poll ${poll.slug}.`);
}
exports.handleUpdatePoll = handleUpdatePoll;
