import type { Organisation, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event.js'
import type { Locales } from '../../../core/i18n/constant.js'

export class OrganisationCreatedEvent extends EventBusEvent<{
  organisation: Organisation & { administrators: Array<{ user: VerifiedUser }> }
  administrator: VerifiedUser
  locale: Locales
  origin: string
}> {
  name = 'OrganisationCreatedEvent'
}
