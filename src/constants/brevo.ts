export const ATTRIBUTE_IS_ORGANISATION_ADMIN = 'IS_ORGANISATION_ADMIN'
export const ATTRIBUTE_ORGANISATION_NAME = 'ORGANISATION_NAME'
export const ATTRIBUTE_ORGANISATION_SLUG = 'ORGANISATION_SLUG'
export const ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER =
  'LAST_POLL_PARTICIPANTS_NUMBER'
export const ATTRIBUTE_USER_ID = 'USER_ID'
export const ATTRIBUTE_PRENOM = 'PRENOM'
export const ATTRIBUTE_OPT_IN = 'OPT_IN'
export const ATTRIBUTE_LAST_SIMULATION_DATE = 'LAST_SIMULATION_DATE'
export const ATTRIBUTE_ACTIONS_SELECTED_NUMBER = 'ACTIONS_SELECTED_NUMBER'
export const ATTRIBUTE_LAST_SIMULATION_BILAN_FOOTPRINT =
  'LAST_SIMULATION_BILAN_FOOTPRINT'
export const ATTRIBUTE_LAST_SIMULATION_TRANSPORTS_FOOTPRINT =
  'LAST_SIMULATION_TRANSPORTS_FOOTPRINT'
export const ATTRIBUTE_LAST_SIMULATION_ALIMENTATION_FOOTPRINT =
  'LAST_SIMULATION_ALIMENTATION_FOOTPRINT'
export const ATTRIBUTE_LAST_SIMULATION_LOGEMENT_FOOTPRINT =
  'LAST_SIMULATION_LOGEMENT_FOOTPRINT'
export const ATTRIBUTE_LAST_SIMULATION_DIVERS_FOOTPRINT =
  'LAST_SIMULATION_DIVERS_FOOTPRINT'
export const ATTRIBUTE_LAST_SIMULATION_SERVICES_FOOTPRINT =
  'LAST_SIMULATION_SERVICES_FOOTPRINT'
export const ATTRIBUTE_NUMBER_CREATED_GROUPS = 'NUMBER_CREATED_GROUPS'
export const ATTRIBUTE_LAST_GROUP_CREATION_DATE = 'LAST_GROUP_CREATION_DATE'
export const ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT =
  'NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT'

// List IDs
export const LIST_ID_ORGANISATIONS = 27
export const LIST_ID_GROUP_CREATED = 29
export const LIST_ID_GROUP_JOINED = 30

export const LIST_SUBSCRIBED_END_SIMULATION = 22
export const LIST_SUBSCRIBED_UNFINISHED_SIMULATION = 35

export const LIST_NOS_GESTES_TRANSPORT_NEWSLETTER = 32

// Template IDs
export const TEMPLATE_ID_SIMULATION_COMPLETED = 55
export const TEMPLATE_ID_GROUP_CREATED = 57
export const TEMPLATE_ID_GROUP_JOINED = 58
export const TEMPLATE_ID_VERIFICATION_CODE = 66
export const TEMPLATE_ID_ORGANISATION_JOINED = 71
export const TEMPLATE_ID_SIMULATION_IN_PROGRESS = 102

// Matomo campaigns & keywords
export const MATOMO_CAMPAIGN_KEY = 'mtm_campaign'
export const MATOMO_CAMPAIGN_EMAIL_AUTOMATISE = 'email-automatise'

export const MATOMO_KEYWORD_KEY = 'mtm_kwd'
export const MATOMO_KEYWORDS = {
  [TEMPLATE_ID_SIMULATION_COMPLETED]: 'fin-retrouver-simulation',
  [TEMPLATE_ID_SIMULATION_IN_PROGRESS]: 'pause-test-en-cours',
  [TEMPLATE_ID_GROUP_CREATED]: {
    GROUP_URL: 'groupe-admin-voir-classement',
    SHARE_URL: 'groupe-admin-url-partage',
    DELETE_URL: 'groupe-admin-delete',
  },
  [TEMPLATE_ID_GROUP_JOINED]: {
    GROUP_URL: 'groupe-invite-voir-classement',
    SHARE_URL: 'groupe-invite-url-partage',
    DELETE_URL: 'groupe-invite-delete',
  },
} as const
