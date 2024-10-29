import { Attributes } from '../../adapters/brevo/constant'
import type { GroupType } from '../../schemas/GroupSchema'
import { Group } from '../../schemas/GroupSchema'
import { createOrUpdateContact } from '../email/createOrUpdateContact'

type Props = {
  group: GroupType
}

export async function handleUpdateGroupNumberOneParticipant({ group }: Props) {
  const { administrator: { userId, email } = {} } = group

  const groupsCreatedWithOneParticipant = await Group.find({
    'administrator.userId': userId,
    participants: { $size: 1 },
  })

  return createOrUpdateContact({
    email: email ?? '',
    userId,
    otherAttributes: {
      [Attributes.NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]:
        groupsCreatedWithOneParticipant.length,
    },
  })
}
