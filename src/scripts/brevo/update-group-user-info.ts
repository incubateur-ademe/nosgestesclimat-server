import mongoose from 'mongoose'
import { config } from '../../config'
import {
  ATTRIBUTE_LAST_GROUP_CREATION_DATE,
  ATTRIBUTE_NUMBER_CREATED_GROUPS,
  ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT,
} from '../../constants/brevo'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { Group, GroupType } from '../../schemas/GroupSchema'

function processGroupsByAdministrator(
  groups: GroupType[]
): Record<string, GroupType[]> {
  const groupsByAdministrator: Record<string, GroupType[]> = {}

  for (const group of groups) {
    if (group.administrator.email) {
      if (!groupsByAdministrator[group.administrator.email]) {
        groupsByAdministrator[group.administrator.email] = []
      }

      groupsByAdministrator[group.administrator.email].push(group)
    }
  }

  return groupsByAdministrator
}

/**
 * Update the user document for each organisation administrator
 * to save brevo attributes
 */
export async function updateGroupUserInfo() {
  try {
    mongoose.connect(config.mongo.url)

    const groups = await Group.find({})

    const groupsByAdministrator = processGroupsByAdministrator(groups)
    console.log(
      'Number of groups by administrator',
      Object.keys(groupsByAdministrator).length
    )
    for (const administratorEmail in groupsByAdministrator) {
      console.log(
        'Number of groups for',
        administratorEmail,
        groupsByAdministrator[administratorEmail].length
      )

      // Get the last poll updated
      const lastGroupCreated = groupsByAdministrator[administratorEmail]?.sort(
        (a, b) => {
          return (b as any).createdAt.getTime() - (a as any).createdAt.getTime()
        }
      )[0]

      const numberGroupWithOneParticipant = groupsByAdministrator[
        administratorEmail
      ]?.filter((group) => group.participants.length === 1).length

      console.log(
        'Updating contact',
        administratorEmail,
        numberGroupWithOneParticipant
      )
      try {
        await createOrUpdateContact({
          email: administratorEmail,
          otherAttributes: {
            [ATTRIBUTE_NUMBER_CREATED_GROUPS]:
              groupsByAdministrator[administratorEmail]?.length,
            [ATTRIBUTE_LAST_GROUP_CREATION_DATE]: (
              lastGroupCreated as any
            ).createdAt.toISOString(),
            [ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]:
              numberGroupWithOneParticipant,
          },
        })
      } catch (error) {
        console.error('Error updating contact', administratorEmail, error)
      }

      console.log('Updated.')
    }
  } catch (error) {
    console.error('Error updating group admin contact attributes', error)
  } finally {
    mongoose.disconnect()
    process.exit(0)
  }
}

updateGroupUserInfo()
