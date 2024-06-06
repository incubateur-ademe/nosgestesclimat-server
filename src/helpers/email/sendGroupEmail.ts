import axios from 'axios'
import { Group, GroupType } from '../../schemas/GroupSchema'
import { axiosConf } from '../../constants/axios'
import { createOrUpdateContact } from './createOrUpdateContact'
import {
  ATTRIBUTE_LAST_GROUP_CREATION_DATE,
  ATTRIBUTE_NUMBER_CREATED_GROUPS,
  ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT,
  LIST_ID_GROUP_CREATED,
  LIST_ID_GROUP_JOINED,
  TEMPLATE_ID_GROUP_CREATED,
  TEMPLATE_ID_GROUP_JOINED,
} from '../../constants/brevo'
import { validateEmail } from '../../utils/validation/validateEmail'

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

  if (!validateEmail(email)) {
    console.error('Invalid email', email)
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

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId: isCreation
          ? TEMPLATE_ID_GROUP_CREATED
          : TEMPLATE_ID_GROUP_JOINED,
        params: {
          GROUP_URL: `${origin}/amis/resultats?groupId=${group?._id}&mtm_campaign=voir-mon-groupe-email`,
          SHARE_URL: `${origin}/amis/invitation?groupId=${group?._id}&mtm_campaign=invitation-groupe-email`,
          DELETE_URL: `${origin}/amis/supprimer?groupId=${group?._id}&userId=${userId}&mtm_campaign=invitation-groupe-email`,
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
