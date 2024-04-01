"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddAttributes = void 0;
const brevo_1 = require("../../constants/brevo");
function handleAddAttributes({ name, userId, optin, simulation, otherAttributes, }) {
    const attributesUpdated = {
        ...otherAttributes,
    };
    if (name) {
        attributesUpdated[brevo_1.ATTRIBUTE_PRENOM] = name;
    }
    if (optin !== undefined) {
        attributesUpdated[brevo_1.ATTRIBUTE_OPT_IN] = optin;
    }
    if (userId) {
        attributesUpdated[brevo_1.ATTRIBUTE_USER_ID] = userId;
    }
    if (simulation) {
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_DATE] = new Date().toISOString();
        attributesUpdated[brevo_1.ATTRIBUTE_ACTIONS_SELECTED_NUMBER] =
            simulation?.actionChoices
                ? Object.keys(simulation?.actionChoices)?.length
                : 0;
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT] =
            (simulation?.computedResults?.bilan / 1000)?.toLocaleString(undefined, {
                maximumFractionDigits: 1,
            }) ?? 0;
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT] =
            (simulation?.computedResults?.categories?.transport / 1000)?.toLocaleString(undefined, {
                maximumFractionDigits: 1,
            }) ?? 0;
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT] =
            (simulation?.computedResults?.categories?.alimentation / 1000)?.toLocaleString(undefined, {
                maximumFractionDigits: 1,
            }) ?? 0;
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT] =
            (simulation?.computedResults?.categories?.logement / 1000)?.toLocaleString(undefined, {
                maximumFractionDigits: 1,
            }) ?? 0;
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT] =
            (simulation?.computedResults?.categories?.divers / 1000)?.toLocaleString(undefined, {
                maximumFractionDigits: 1,
            }) ?? 0;
        attributesUpdated[brevo_1.ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT] =
            (simulation?.computedResults?.categories?.['services sociétaux'] / 1000)?.toLocaleString(undefined, {
                maximumFractionDigits: 1,
            }) ?? 0;
    }
    return attributesUpdated;
}
exports.handleAddAttributes = handleAddAttributes;
