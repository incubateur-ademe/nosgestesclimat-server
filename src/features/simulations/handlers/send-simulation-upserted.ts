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
  attributes: {
    origin,
    user,
    organisation,
    simulation,
    sendEmail,
    verified,
    locale,
    poll,
  },
}) => {
  if (!user.email || !sendEmail) {
    return
  }

  const { email } = user

  if (attributes.group) {
    const { user, administrator, group } = attributes
    const isAdministrator = user.id === administrator.id

    if (simulation?.progression === 1) {
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

    // If the simulation is not completed, do not send anything
    return
  }

  if (simulation?.progression === 1 && organisation) {
    return sendPollSimulationUpsertedEmail({
      organisation,
      simulation,
      locale,
      origin,
      email,
      poll,
    })
  }

  return sendSimulationUpsertedEmail({
    email,
    origin,
    locale,
    simulation,
    verified: !!verified,
  })
}
