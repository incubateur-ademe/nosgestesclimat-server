import type { VerifiedUser } from '@prisma/client'
import type { OrganisationCreatedEventAttributes } from './OrganisationCreated.event'
import type { OrganisationUpdatedEventAttributes } from './OrganisationUpdated.event'
import type { PollCreatedEventAttributes } from './PollCreated.event'
import type { PollDeletedEventAttributes } from './PollDeletedEvent'
import type { PollUpdatedEventAttributes } from './PollUpdated.event'

type OrganisationEventAttributes =
  | OrganisationCreatedEventAttributes
  | OrganisationUpdatedEventAttributes

type PollEventAttributes = { administrator?: undefined } & (
  | PollCreatedEventAttributes
  | PollDeletedEventAttributes
  | PollUpdatedEventAttributes
)

const sanitizeName = (user?: VerifiedUser) => {
  if (user?.name) {
    user.name = user.name.split(' _ ').join(' ')
  }
}

export const sanitizeOrganisationAdministratorName = <
  T extends OrganisationEventAttributes | PollEventAttributes,
>(
  eventAttributes: T
): T => {
  const {
    organisation: { administrators },
    administrator,
  } = eventAttributes

  ;[administrator, ...administrators.map(({ user }) => user)].forEach((user) =>
    sanitizeName(user)
  )

  return eventAttributes
}
