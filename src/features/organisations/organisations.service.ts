import type { Request } from 'express'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import { isPrismaErrorUniqueConstraintFailed } from '../../core/typeguards/isPrismaError'
import { OrganisationCreatedEvent } from './events/OrganisationCreated.event'
import { createOrganisationAndAdministrator } from './organisations.repository'
import type { OrganisationCreateDto } from './organisations.validator'

export const createOrganisation = async ({
  organisationDto,
  origin,
  user,
}: {
  organisationDto: OrganisationCreateDto
  origin: string
  user: NonNullable<Request['user']>
}) => {
  try {
    const { organisation, administrator } =
      await createOrganisationAndAdministrator(organisationDto, user)

    const organisationCreatedEvent = new OrganisationCreatedEvent({
      administrator,
      organisation,
      origin,
    })

    EventBus.emit(organisationCreatedEvent)

    await EventBus.once(organisationCreatedEvent)

    return {
      ...organisation,
      administrators: organisation.administrators.map(
        ({
          id,
          user: {
            id: userId,
            name,
            email,
            createdAt,
            optedInForCommunications,
            position,
            telephone,
            updatedAt,
          },
        }) => ({
          id,
          userId,
          name,
          email,
          position,
          telephone,
          optedInForCommunications,
          createdAt,
          updatedAt,
        })
      ),
    }
  } catch (e) {
    if (isPrismaErrorUniqueConstraintFailed(e)) {
      throw new ForbiddenException(
        "Forbidden ! An organisation with this administrator's email already exists."
      )
    }

    throw e
  }
}
