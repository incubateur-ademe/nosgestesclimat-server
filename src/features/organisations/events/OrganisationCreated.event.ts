import type { Organisation, VerifiedUser } from '@prisma/client'
import { EventBusEvent } from '../../../core/event-bus/event'

export class OrganisationCreatedEvent extends EventBusEvent<{
  organisation: Organisation
  administrator: VerifiedUser
  origin: string
}> {}
