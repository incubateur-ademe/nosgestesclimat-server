"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpdatePoll = void 0;
const sendEmail_1 = require("../email/sendEmail");
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
async function handleUpdatePoll({ poll, simulationSaved, email, }) {
    if (!poll || poll.simulations.includes(simulationSaved._id)) {
        return;
    }
    poll.simulations.push(simulationSaved._id);
    await poll.save();
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
