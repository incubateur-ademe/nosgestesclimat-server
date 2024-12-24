import { StatusCodes } from 'http-status-codes'
import type { ValueOf } from '../../types/types'

export enum TemplateIds {
  SIMULATION_COMPLETED = 55,
  GROUP_CREATED = 57,
  GROUP_JOINED = 58,
  VERIFICATION_CODE = 66,
  ORGANISATION_CREATED = 70,
  ORGANISATION_JOINED = 71,
  SIMULATION_IN_PROGRESS = 102,
  API_VERIFICATION_CODE = 116,
}

export enum Attributes {
  NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT = 'NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT',
  LAST_SIMULATION_ALIMENTATION_FOOTPRINT = 'LAST_SIMULATION_ALIMENTATION_FOOTPRINT',
  LAST_SIMULATION_TRANSPORTS_FOOTPRINT = 'LAST_SIMULATION_TRANSPORTS_FOOTPRINT',
  LAST_SIMULATION_LOGEMENT_FOOTPRINT = 'LAST_SIMULATION_LOGEMENT_FOOTPRINT',
  LAST_SIMULATION_SERVICES_FOOTPRINT = 'LAST_SIMULATION_SERVICES_FOOTPRINT',
  LAST_SIMULATION_DIVERS_FOOTPRINT = 'LAST_SIMULATION_DIVERS_FOOTPRINT',
  LAST_SIMULATION_BILAN_FOOTPRINT = 'LAST_SIMULATION_BILAN_FOOTPRINT',
  LAST_POLL_PARTICIPANTS_NUMBER = 'LAST_POLL_PARTICIPANTS_NUMBER',
  LAST_SIMULATION_BILAN_WATER = 'LAST_SIMULATION_BILAN_WATER',
  LAST_GROUP_CREATION_DATE = 'LAST_GROUP_CREATION_DATE',
  ACTIONS_SELECTED_NUMBER = 'ACTIONS_SELECTED_NUMBER',
  IS_ORGANISATION_ADMIN = 'IS_ORGANISATION_ADMIN',
  NUMBER_CREATED_GROUPS = 'NUMBER_CREATED_GROUPS',
  LAST_SIMULATION_DATE = 'LAST_SIMULATION_DATE',
  ORGANISATION_NAME = 'ORGANISATION_NAME',
  ORGANISATION_SLUG = 'ORGANISATION_SLUG',
  USER_ID = 'USER_ID',
  PRENOM = 'PRENOM',
  OPT_IN = 'OPT_IN',
}

export enum ListIds {
  MAIN_NEWSLETTER = 22,
  ORGANISATIONS = 27,
  GROUP_CREATED = 29,
  GROUP_JOINED = 30,
  TRANSPORT_NEWSLETTER = 32,
  LOGEMENT_NEWSLETTER = 36,
  UNFINISHED_SIMULATION = 35,
}

export const AllNewsletters = [
  ListIds.MAIN_NEWSLETTER,
  ListIds.LOGEMENT_NEWSLETTER,
  ListIds.TRANSPORT_NEWSLETTER,
] as const

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

export const ClientErrors = {
  BAD_REQUEST: {
    code: 'invalid_parameter',
    status: StatusCodes.BAD_REQUEST,
  },
  NOT_FOUND: {
    code: 'document_not_found',
    status: StatusCodes.NOT_FOUND,
  },
} as const

export type ClientErrors = ValueOf<typeof ClientErrors>
