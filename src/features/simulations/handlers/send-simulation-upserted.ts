import {
  sendGroupCreatedEmail,
  sendGroupParticipantSimulationUpsertedEmail,
  sendPollSimulationUpsertedEmail,
  sendSimulationUpsertedEmail,
} from '../../../adapters/brevo/client.js'
import type { Handler } from '../../../core/event-bus/handler.js'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event.js'

export const sendSimulationUpserted: Handler<SimulationUpsertedEvent> = ({
  attributes,
  attributes: { origin, user, organisation, simulation, sendEmail, locale },
}) => {
  const poll = 'poll' in attributes ? attributes.poll : undefined
  if (!user.email || !sendEmail) {
    return
  }

  const { email } = user

  if (simulation?.progression === 1) {
    if (organisation && poll) {
      return sendPollSimulationUpsertedEmail({
        organisation,
        poll,
        simulation,
        locale,
        origin,
        email,
      })
    }

    if (attributes.group) {
      const { user, administrator, group } = attributes
      const isAdministrator = user.id === administrator.id
      const params = {
        group,
        origin,
        user,
      }

      return isAdministrator
        ? // @ts-expect-error sometimes control-flow is broken
          sendGroupCreatedEmail(params)
        : // @ts-expect-error sometimes control-flow is broken
          sendGroupParticipantSimulationUpsertedEmail(params)
    }
  }

  return sendSimulationUpsertedEmail({
    email,
    origin,
    simulation,
  })
}
