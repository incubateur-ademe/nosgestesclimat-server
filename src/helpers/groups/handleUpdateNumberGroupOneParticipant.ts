import { create } from 'domain'
import { Group, GroupType } from '../../schemas/GroupSchema'
import { createOrUpdateContact } from '../email/createOrUpdateContact'
import { ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT } from '../../constants/brevo'

type Props = {
  group: GroupType
}

export async function handleUpdateGroupNumberOneParticipant({ group }: Props) {
  const { userId } = group.administrator

  const groupsCreatedWithOneParticipant = await Group.find({
    'administrator.userId': userId,
    participants: { $size: 1 },
  })

  return createOrUpdateContact({
    email: group.administrator.email ?? '',
    userId,
    otherAttributes: {
      [ATTRIBUTE_NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT]:
        groupsCreatedWithOneParticipant.length,
    },
  })
}
