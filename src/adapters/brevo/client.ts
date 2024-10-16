import type {
  Group,
  Organisation,
  Simulation,
  User,
  VerifiedUser,
} from '@prisma/client'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { config } from '../../config'
import { isNetworkOrTimeoutOrRetryableError } from '../../core/typeguards/isRetryableAxiosError'
import {
  MATOMO_CAMPAIGN_EMAIL_AUTOMATISE,
  MATOMO_CAMPAIGN_KEY,
  MATOMO_KEYWORD_KEY,
  MATOMO_KEYWORDS,
  TemplateIds,
} from './constant'

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

const sendGroupEmail = ({
  origin,
  templateId,
  group: { id: groupId, name: groupName },
  user: { id: userId, email, name: userName },
}: Readonly<{
  origin: string
  group: Pick<Group, 'id' | 'name'>
  user: Pick<User, 'id' | 'name'> & { email: string }
  templateId: TemplateIds.GROUP_CREATED | TemplateIds.GROUP_JOINED
}>) => {
  const groupUrl = new URL(`${origin}/amis/resultats`)
  const { searchParams: groupSp } = groupUrl
  groupSp.append('groupId', groupId)
  groupSp.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
  groupSp.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId].GROUP_URL)

  const shareUrl = new URL(`${origin}/amis/invitation`)
  const { searchParams: shareSp } = shareUrl
  shareSp.append('groupId', groupId)
  shareSp.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
  shareSp.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId].SHARE_URL)

  const deleteUrl = new URL(`${origin}/amis/supprimer`)
  const { searchParams: deleteSp } = deleteUrl
  deleteSp.append('groupId', groupId)
  deleteSp.append('userId', userId)
  deleteSp.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
  deleteSp.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId].DELETE_URL)

  return sendEmail({
    email,
    templateId,
    params: {
      GROUP_URL: groupUrl.toString(),
      SHARE_URL: shareUrl.toString(),
      DELETE_URL: deleteUrl.toString(),
      GROUP_NAME: groupName,
      NAME: userName,
    },
  })
}

export const sendGroupCreatedEmail = ({
  origin,
  group,
  user,
}: Readonly<{
  origin: string
  group: Pick<Group, 'id' | 'name'>
  user: Pick<User, 'id' | 'name'> & { email: string }
}>) => {
  return sendGroupEmail({
    templateId: TemplateIds.GROUP_CREATED,
    origin,
    group,
    user,
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

export const sendGroupParticipantSimulationUpsertedEmail = ({
  origin,
  group,
  user,
}: Readonly<{
  origin: string
  group: Pick<Group, 'id' | 'name'>
  user: Pick<User, 'id' | 'name'> & { email: string }
}>) => {
  return sendGroupEmail({
    templateId: TemplateIds.GROUP_JOINED,
    origin,
    group,
    user,
  })
}

export const sendPollSimulationUpsertedEmail = async ({
  email,
  origin,
  organisation: { name, slug },
}: Readonly<{
  email: string
  origin: string
  organisation: Pick<Organisation, 'name' | 'slug'>
}>) => {
  const templateId = TemplateIds.ORGANISATION_JOINED

  const detailedViewUrl = new URL(
    `${origin}/organisations/${slug}/resultats-detailles`
  )
  const { searchParams } = detailedViewUrl
  searchParams.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
  searchParams.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId])

  await sendEmail({
    email,
    templateId,
    params: {
      ORGANISATION_NAME: name,
      DETAILED_VIEW_URL: detailedViewUrl.toString(),
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
