export enum TemplateIds {
  SIMULATION_COMPLETED = 55,
  GROUP_CREATED = 57,
  GROUP_JOINED = 58,
  VERIFICATION_CODE = 66,
  ORGANISATION_CREATED = 70,
  ORGANISATION_JOINED = 71,
  SIMULATION_IN_PROGRESS = 102,
}

export enum Attributes {
  LAST_POLL_PARTICIPANTS_NUMBER = 'LAST_POLL_PARTICIPANTS_NUMBER',
  IS_ORGANISATION_ADMIN = 'IS_ORGANISATION_ADMIN',
  ORGANISATION_NAME = 'ORGANISATION_NAME',
  ORGANISATION_SLUG = 'ORGANISATION_SLUG',
  USER_ID = 'USER_ID',
  PRENOM = 'PRENOM',
  OPT_IN = 'OPT_IN',
}

// Matomo campaigns & keywords
export const MATOMO_CAMPAIGN_KEY = 'mtm_campaign'
export const MATOMO_CAMPAIGN_EMAIL_AUTOMATISE = 'email-automatise'

export const MATOMO_KEYWORD_KEY = 'mtm_kwd'
export const MATOMO_KEYWORDS = {
  [TemplateIds.SIMULATION_COMPLETED]: 'fin-retrouver-simulation',
  [TemplateIds.SIMULATION_IN_PROGRESS]: 'pause-test-en-cours',
  [TemplateIds.GROUP_CREATED]: {
    GROUP_URL: 'groupe-admin-voir-classement',
    SHARE_URL: 'groupe-admin-url-partage',
    DELETE_URL: 'groupe-admin-delete',
  },
  [TemplateIds.GROUP_JOINED]: {
    GROUP_URL: 'groupe-invite-voir-classement',
    SHARE_URL: 'groupe-invite-url-partage',
    DELETE_URL: 'groupe-invite-delete',
  },
  [TemplateIds.ORGANISATION_CREATED]: 'orga-admin-creation',
  [TemplateIds.ORGANISATION_JOINED]: 'orga-invite-campagne',
} as const
