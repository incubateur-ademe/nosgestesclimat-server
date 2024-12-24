import type {
  Group,
  Organisation,
  Simulation,
  User,
  VerifiedUser,
} from '@prisma/client'
import type { AxiosError } from 'axios'
import axios, { isAxiosError } from 'axios'
import axiosRetry from 'axios-retry'
import { z } from 'zod'
import { config } from '../../config'
import { isNetworkOrTimeoutOrRetryableError } from '../../core/typeguards/isRetryableAxiosError'
import type {
  ActionChoicesSchema,
  ComputedResultSchema,
} from '../../features/simulations/simulations.validator'
import {
  AllNewsletters,
  Attributes,
  ClientErrors,
  ListIds,
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

const isBrevoClientError =
  <Error extends ClientErrors>({ code, status }: Error) =>
  (
    error: AxiosError
  ): error is AxiosError & {
    response: { status: Error['status']; data: { code: Error['code'] } }
  } => {
    return (
      error.response?.status === status &&
      !!error.response.data &&
      typeof error.response.data === 'object' &&
      'code' in error.response.data &&
      error.response.data.code === code
    )
  }

export const isBadRequest = isBrevoClientError(ClientErrors.BAD_REQUEST)

export const isNotFound = isBrevoClientError(ClientErrors.NOT_FOUND)

type NewsletterDto = {
  id: number
  name: string
  startDate: string
  endDate: string
  totalBlacklisted: number
  totalSubscribers: number
  uniqueSubscribers: number
  folderId: number
  createdAt: string
  dynamicList: boolean
}

export const fetchNewsletter = (listId: number) => {
  return brevo.get<NewsletterDto>(`/v3/contacts/lists/${listId}`)
}

type ContactDto = {
  email: string
  id: number
  emailBlacklisted: boolean
  smsBlacklisted: boolean
  createdAt: string
  modifiedAt: string
  attributes: Record<string, string | number | boolean>
  listIds: number[]
  statistics: unknown
}

const BrevoContactDtoSchema = z.object({
  id: z.number(),
  email: z.string(),
  listIds: z.array(z.number()),
})

export const fetchContact = async (email: string) => {
  const { data } = await brevo.get<ContactDto>(
    `/v3/contacts/${encodeURIComponent(email)}`
  )

  return BrevoContactDtoSchema.parse(data)
}

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
  origin,
  userId,
  email,
  code,
}: Readonly<{
  origin: string
  email: string
  code: string
  userId?: string | null
}>) => {
  if (userId) {
    return sendEmail({
      email,
      templateId: TemplateIds.VERIFICATION_CODE,
      params: {
        VERIFICATION_CODE: code,
      },
    })
  }

  const apiTokenUrl = new URL(`${origin}/integrations-api/v1/tokens`)
  const { searchParams } = apiTokenUrl
  searchParams.append('code', code)
  searchParams.append('email', email)

  return sendEmail({
    email,
    templateId: TemplateIds.API_VERIFICATION_CODE,
    params: {
      API_TOKEN_URL: apiTokenUrl.toString(),
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

const addOrUpdateContact = ({
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

const unsubscribeContactFromList = async ({
  email,
  listId,
}: Readonly<{
  email: string
  listId: ListIds
}>) => {
  try {
    await brevo.post(`/v3/contacts/lists/${listId}/contacts/remove`, {
      emails: [email],
    })
  } catch (e) {
    // Brevo raises if not subscribed...
    if (!isAxiosError(e) || !isBadRequest(e)) {
      throw e
    }
  }
}

export const addOrUpdateContactAfterLogin = ({
  userId,
  email,
}: {
  userId: string
  email: string
}) => {
  const attributes = {
    [Attributes.USER_ID]: userId,
  }

  return addOrUpdateContact({
    email,
    attributes,
  })
}

export const addOrUpdateContactAndNewsLetterSubscriptions = async ({
  user,
  email,
  listIds,
}: {
  user: {
    id: string
    name?: string | null
  }
  email: string
  listIds: ListIds[]
}) => {
  const attributes = {
    [Attributes.USER_ID]: user.id,
    [Attributes.PRENOM]: user.name,
  }

  await addOrUpdateContact({
    email,
    attributes,
    listIds,
  })

  const wantedListIds = new Set(listIds)
  const contact = await fetchContact(email)

  await contact.listIds.reduce(async (promise, listId) => {
    await promise

    if (!wantedListIds.has(listId)) {
      await unsubscribeContactFromList({
        email,
        listId,
      })
    }
  }, Promise.resolve())

  // Spare fetch request again
  contact.listIds = listIds

  return contact
}

export const addOrUpdateContactAfterOrganisationChange = async ({
  slug,
  email,
  userId,
  organisationName,
  administratorName,
  optedInForCommunications,
  lastPollParticipantsCount,
}: {
  slug: string
  email: string
  userId: string
  organisationName: string
  lastPollParticipantsCount: number
  administratorName?: string | null
  optedInForCommunications?: boolean
}) => {
  const attributes = {
    [Attributes.USER_ID]: userId,
    [Attributes.IS_ORGANISATION_ADMIN]: true,
    [Attributes.ORGANISATION_NAME]: organisationName,
    [Attributes.ORGANISATION_SLUG]: slug,
    [Attributes.LAST_POLL_PARTICIPANTS_NUMBER]: lastPollParticipantsCount,
    [Attributes.OPT_IN]: !!optedInForCommunications,
    ...(administratorName
      ? {
          [Attributes.PRENOM]: administratorName,
        }
      : {}),
  }

  await addOrUpdateContact({
    email,
    attributes,
    ...(optedInForCommunications ? { listIds: [ListIds.ORGANISATIONS] } : {}),
  })

  if (!optedInForCommunications) {
    await unsubscribeContactFromList({
      email,
      listId: ListIds.ORGANISATIONS,
    })
  }
}

export const addOrUpdateAdministratorContactAfterGroupChange = async ({
  email,
  userId,
  administratorName,
  createdGroupsCount,
  lastGroupCreationDate,
  createdGroupsWithOneParticipantCount,
}: {
  email: string
  userId: string
  createdGroupsCount: number
  lastGroupCreationDate: Date | undefined
  administratorName?: string | null
  createdGroupsWithOneParticipantCount: number
}) => {
  const attributes = {
    [Attributes.USER_ID]: userId,
    [Attributes.NUMBER_CREATED_GROUPS]: createdGroupsCount,
    [Attributes.LAST_GROUP_CREATION_DATE]: lastGroupCreationDate?.toISOString(),
    [Attributes.NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]:
      createdGroupsWithOneParticipantCount,
    ...(administratorName
      ? {
          [Attributes.PRENOM]: administratorName,
        }
      : {}),
  }

  await addOrUpdateContact({
    email,
    ...(createdGroupsCount > 0
      ? {
          /**
           * This list is purely technical for groups
           * TODO update CGUs or warn user that we will use his mail
           */
          listIds: [ListIds.GROUP_CREATED],
        }
      : {}),
    attributes,
  })

  if (createdGroupsCount === 0) {
    await unsubscribeContactFromList({
      email,
      listId: ListIds.GROUP_CREATED,
    })
  }
}

export const addOrUpdateParticipantContactAfterGroupChange = async ({
  email,
  joinedGroupsCount,
}: {
  email: string
  joinedGroupsCount: number
}) => {
  if (joinedGroupsCount === 0) {
    await unsubscribeContactFromList({
      email,
      listId: ListIds.GROUP_JOINED,
    })
  }
}

const NUMBER_OF_DAYS_IN_A_YEAR = 365

const NUMBER_OF_KG_IN_A_TON = 1000

export const addOrUpdateContactAfterSimulationCreated = async ({
  name,
  email,
  userId,
  newsletters,
  actionChoices,
  computedResults,
  lastSimulationDate,
  incompleteSumulations,
  subscribeToGroupNewsletter,
}: {
  name: string | null
  email: string
  userId: string
  newsletters?: Array<
    | ListIds.MAIN_NEWSLETTER
    | ListIds.TRANSPORT_NEWSLETTER
    | ListIds.LOGEMENT_NEWSLETTER
  >
  actionChoices?: ActionChoicesSchema
  computedResults: ComputedResultSchema
  lastSimulationDate: Date
  incompleteSumulations: number
  subscribeToGroupNewsletter: boolean
}) => {
  const locale = 'fr-FR' // for now
  const bilan = computedResults?.carbone?.bilan ?? 0
  const transport = computedResults?.carbone?.categories?.transport ?? 0
  const alimentation = computedResults?.carbone?.categories?.alimentation ?? 0
  const logement = computedResults?.carbone?.categories?.logement ?? 0
  const divers = computedResults?.carbone?.categories?.divers ?? 0
  const services =
    computedResults?.carbone?.categories?.['services sociétaux'] ?? 0
  const eau = computedResults?.eau?.bilan ?? 0

  const attributes = {
    [Attributes.USER_ID]: userId,
    [Attributes.LAST_SIMULATION_DATE]: lastSimulationDate.toISOString(),
    [Attributes.ACTIONS_SELECTED_NUMBER]: Object.values(
      actionChoices || {}
    ).filter((v) => !!v).length,
    [Attributes.LAST_SIMULATION_BILAN_FOOTPRINT]: (
      bilan / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(locale, {
      maximumFractionDigits: 1,
    }),
    [Attributes.LAST_SIMULATION_TRANSPORTS_FOOTPRINT]: (
      transport / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(locale, {
      maximumFractionDigits: 1,
    }),
    [Attributes.LAST_SIMULATION_ALIMENTATION_FOOTPRINT]: (
      alimentation / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(locale, {
      maximumFractionDigits: 1,
    }),
    [Attributes.LAST_SIMULATION_LOGEMENT_FOOTPRINT]: (
      logement / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(locale, {
      maximumFractionDigits: 1,
    }),
    [Attributes.LAST_SIMULATION_DIVERS_FOOTPRINT]: (
      divers / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(locale, {
      maximumFractionDigits: 1,
    }),
    [Attributes.LAST_SIMULATION_SERVICES_FOOTPRINT]: (
      services / NUMBER_OF_KG_IN_A_TON
    ).toLocaleString(locale, {
      maximumFractionDigits: 1,
    }),
    [Attributes.LAST_SIMULATION_BILAN_WATER]: Math.round(
      eau / NUMBER_OF_DAYS_IN_A_YEAR
    ).toString(),
    ...(name
      ? {
          [Attributes.PRENOM]: name,
        }
      : {}),
  }

  await addOrUpdateContact({
    email,
    attributes,
    ...(subscribeToGroupNewsletter ? { listIds: [ListIds.GROUP_JOINED] } : {}),
    ...(newsletters?.length ? { listIds: newsletters } : {}),
  })

  if (incompleteSumulations === 0) {
    await unsubscribeContactFromList({
      email,
      listId: ListIds.UNFINISHED_SIMULATION,
    })
  }

  if (newsletters) {
    const userNewsletters = new Set(newsletters)
    for (const newsletter of AllNewsletters) {
      if (!userNewsletters.has(newsletter)) {
        await unsubscribeContactFromList({
          email,
          listId: newsletter,
        })
      }
    }
  }
}

export const addOrUpdateContactAfterIncompleteSimulationCreated = ({
  name,
  email,
  userId,
}: {
  name: string | null
  email: string
  userId: string
}) => {
  const attributes = {
    [Attributes.USER_ID]: userId,
    ...(name
      ? {
          [Attributes.PRENOM]: name,
        }
      : {}),
  }

  return addOrUpdateContact({
    email,
    attributes,
    listIds: [ListIds.UNFINISHED_SIMULATION],
  })
}
