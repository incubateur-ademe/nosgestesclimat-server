import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import {
  ATTRIBUTE_LAST_GROUP_CREATION_DATE,
  ATTRIBUTE_NUMBER_CREATED_GROUPS,
  ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT,
  LIST_ID_GROUP_CREATED,
  LIST_ID_GROUP_JOINED,
  MATOMO_CAMPAIGN_EMAIL_AUTOMATISE,
  MATOMO_CAMPAIGN_KEY,
  MATOMO_KEYWORD_KEY,
  MATOMO_KEYWORDS,
  TEMPLATE_ID_GROUP_CREATED,
  TEMPLATE_ID_GROUP_JOINED,
} from '../../constants/brevo'
import type { GroupType } from '../../schemas/GroupSchema'
import { Group } from '../../schemas/GroupSchema'
import { createOrUpdateContact } from './createOrUpdateContact'

/**
 * Send an email to a user when they join a group or when a group is created (based on the isCreation parameter)
 */
type Props = {
  group: GroupType
  userId: string
  name?: string
  email?: string
  isCreation: boolean
  origin: string
  numberCreatedGroups?: number
}
export async function sendGroupEmail({
  group,
  userId,
  name,
  email,
  isCreation,
  origin,
  numberCreatedGroups,
}: Props) {
  // If no email or no name is provided, we don't do anything
  if (!email || !name) {
    return
  }

  // If this is not a creation email and they are the administrator, we don't send the email
  // (they already received it when they created the group)
  if (!isCreation && group.administrator?.userId === userId) {
    return
  }

  try {
    const groupsCreatedWithOneParticipant = await Group.find({
      'administrator.userId': userId,
      participants: { $size: 1 },
    })

    // Create or update the contact
    await createOrUpdateContact({
      userId,
      email,
      name,
      listIds: [isCreation ? LIST_ID_GROUP_CREATED : LIST_ID_GROUP_JOINED],
      otherAttributes: isCreation
        ? {
            [ATTRIBUTE_NUMBER_CREATED_GROUPS]: numberCreatedGroups ?? 0,
            [ATTRIBUTE_LAST_GROUP_CREATION_DATE]: new Date().toISOString(),
            [ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]:
              groupsCreatedWithOneParticipant?.length,
          }
        : {},
    })

    const groupId = group._id.toString()
    const templateId = isCreation
      ? TEMPLATE_ID_GROUP_CREATED
      : TEMPLATE_ID_GROUP_JOINED

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

    await axios.post(
      '/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId,
        params: {
          GROUP_URL: groupUrl.toString(),
          SHARE_URL: shareUrl.toString(),
          DELETE_URL: deleteUrl.toString(),
          GROUP_NAME: group.name,
          NAME: name,
        },
      },
      axiosConf
    )

    console.log(`Email group ${isCreation ? 'creation' : ''} sent to ${email}`)
  } catch (error) {
    throw new Error(error)
  }
}
