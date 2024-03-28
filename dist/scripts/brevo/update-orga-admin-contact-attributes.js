"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrgaAdminContactAttributes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../../config");
const OrganisationSchema_1 = require("../../schemas/OrganisationSchema");
const brevo_1 = require("../../constants/brevo");
const PollSchema_1 = require("../../schemas/PollSchema");
const createOrUpdateContact_1 = require("../../helpers/email/createOrUpdateContact");
async function updateOrgaAdminContactAttributes() {
    try {
        mongoose_1.default.connect(config_1.config.mongo.url);
        const poll = new PollSchema_1.Poll({
            simulations: [],
        });
        const organisations = await OrganisationSchema_1.Organisation.find({}).populate('polls');
        for (const organisation of organisations) {
            for (const administrator of organisation.administrators) {
                // Get the last poll updated
                const lastPollCreated = organisation.polls?.sort((a, b) => {
                    return b.createdAt.getTime() - a.createdAt.getTime();
                })[0];
                console.log('updating orga admin contact attributes', {
                    email: administrator.email,
                    name: administrator.name,
                    otherAttributes: {
                        [brevo_1.ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
                        [brevo_1.ATTRIBUTE_ORGANISATION_NAME]: organisation.name ?? undefined,
                        [brevo_1.ATTRIBUTE_ORGANISATION_SLUG]: organisation.slug ?? undefined,
                        [brevo_1.ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]: lastPollCreated?.simulations?.length ?? 0,
                    },
                });
                await (0, createOrUpdateContact_1.createOrUpdateContact)({
                    email: administrator.email,
                    name: administrator.name,
                    otherAttributes: {
                        [brevo_1.ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
                        [brevo_1.ATTRIBUTE_ORGANISATION_NAME]: organisation.name ?? undefined,
                        [brevo_1.ATTRIBUTE_ORGANISATION_SLUG]: organisation.slug ?? undefined,
                        [brevo_1.ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]: lastPollCreated?.simulations?.length ?? 0,
                    },
                });
                await organisation.save();
            }
        }
    }
    catch (error) {
        console.error('Error updating orga admin contact attributes', error);
    }
    finally {
        mongoose_1.default.disconnect();
        process.exit(0);
    }
}
exports.updateOrgaAdminContactAttributes = updateOrgaAdminContactAttributes;
updateOrgaAdminContactAttributes();
