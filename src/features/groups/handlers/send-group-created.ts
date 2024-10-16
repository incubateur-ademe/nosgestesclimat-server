import { sendGroupCreatedEmail } from '../../../adapters/brevo/client'
import type { GroupCreatedEvent } from '../events/GroupCreated.event'

export const sendGroupCreated = ({
  attributes: {
    group,
    group: { administrator, participants },
    origin,
  },
}: GroupCreatedEvent) => {
  if (!administrator || !administrator.user) {
    return
  }

  const {
    user: { email, name, id },
  } = administrator

  if (!email || !participants.some(({ user: { id: pId } }) => pId === id)) {
    return
  }

  return sendGroupCreatedEmail({
    group,
    origin,
    user: {
      id,
      name,
      email,
    },
  })
}
