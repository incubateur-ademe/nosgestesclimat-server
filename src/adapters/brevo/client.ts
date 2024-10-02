import type { Organisation, Simulation, VerifiedUser } from '@prisma/client'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../config'
import {
  MATOMO_CAMPAIGN_EMAIL_AUTOMATISE,
  MATOMO_CAMPAIGN_KEY,
  MATOMO_KEYWORD_KEY,
  MATOMO_KEYWORDS,
} from '../../constants/brevo'
import { isNetworkOrTimeoutOrRetryableError } from '../../core/typeguards/isRetryableAxiosError'
import { TemplateIds } from './constant'

const brevo = axios.create({
  baseURL: config.thirdParty.brevo.url,
  headers: {
    'api-key': config.thirdParty.brevo.apiKey,
  },
  timeout: 1000,
})

axiosRetry(brevo, {
  retryCondition: isNetworkOrTimeoutOrRetryableError,
  retryDelay: () => 200,
  shouldResetTimeout: true,
})

const sendEmail = ({
  email,
  templateId,
  params,
}: {
  email: string
  templateId: TemplateIds
  params: { [key: string]: unknown }
}) => {
  return brevo.post('/v3/smtp/email', {
    to: [
      {
        name: email,
        email,
      },
    ],
    templateId,
    params,
  })
}

export const sendVerificationCodeEmail = ({
  email,
  code,
}: Readonly<{
  email: string
  code: string
}>) => {
  return sendEmail({
    email,
    templateId: TemplateIds.VERIFICATION_CODE,
    params: {
      VERIFICATION_CODE: code,
    },
  })
}

export const sendOrganisationCreatedEmail = ({
  origin,
  organisation: { name: organisationName, slug },
  administrator: { name: administratorName, email },
}: Readonly<{
  origin: string
  organisation: Pick<Organisation, 'name' | 'slug'>
  administrator: Pick<VerifiedUser, 'name' | 'email'>
}>) => {
  const templateId = TemplateIds.ORGANISATION_CREATED
  const dashBoardUrl = new URL(`${origin}/organisations/${slug}`)
  const { searchParams } = dashBoardUrl
  searchParams.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
  searchParams.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId])

  return sendEmail({
    email,
    templateId,
    params: {
      ADMINISTRATOR_NAME: administratorName,
      ORGANISATION_NAME: organisationName,
      DASHBOARD_URL: dashBoardUrl.toString(),
    },
  })
}

export const sendSimulationUpsertedEmail = ({
  email,
  origin,
  simulation,
}: Readonly<{
  email: string
  origin: string
  simulation: Pick<Simulation, 'id' | 'progression'>
}>) => {
  const isSimulationCompleted = simulation.progression === 1
  const templateId = isSimulationCompleted
    ? TemplateIds.SIMULATION_COMPLETED
    : TemplateIds.SIMULATION_IN_PROGRESS

  const simulationUrl = new URL(origin)
  simulationUrl.pathname = isSimulationCompleted ? 'fin' : 'simulateur/bilan'
  const { searchParams } = simulationUrl
  searchParams.append('sid', simulation.id)
  searchParams.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
  searchParams.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId])

  return sendEmail({
    email,
    templateId,
    params: {
      SIMULATION_URL: simulationUrl.toString(),
    },
  })
}

export const addOrUpdateContact = ({
  email,
  listIds,
  attributes,
}: Readonly<{
  email: string
  attributes: { [key: string]: unknown }
  listIds?: number[]
}>) => {
  return brevo.post('/v3/contacts', {
    email,
    listIds,
    attributes,
    updateEnabled: true,
  })
}
