import {
  sendGroupCreatedEmail,
  sendGroupParticipantSimulationUpsertedEmail,
} from '../../adapters/brevo/client'
import { Attributes, ListIds } from '../../adapters/brevo/constant'
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
      listIds: [isCreation ? ListIds.GROUP_CREATED : ListIds.GROUP_JOINED],
      otherAttributes: isCreation
        ? {
            [Attributes.NUMBER_CREATED_GROUPS]: numberCreatedGroups ?? 0,
            [Attributes.LAST_GROUP_CREATION_DATE]: new Date().toISOString(),
            [Attributes.NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]:
              groupsCreatedWithOneParticipant?.length,
          }
        : {},
    })

    const emailParams = {
      group: {
        id: group._id.toString(),
        name: group.name!,
      },
      user: {
        name,
        email,
        id: userId,
      },
      origin,
    }

    if (isCreation) {
      await sendGroupCreatedEmail(emailParams)
    } else {
      await sendGroupParticipantSimulationUpsertedEmail(emailParams)
    }

    console.log(`Email group ${isCreation ? 'creation' : ''} sent to ${email}`)
  } catch (error) {
    throw new Error(error)
  }
}
