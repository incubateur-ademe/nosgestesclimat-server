import {
  sendGroupCreatedEmail,
  sendGroupParticipantSimulationUpsertedEmail,
  sendPollSimulationUpsertedEmail,
  sendSimulationUpsertedEmail,
} from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'

export const sendSimulationUpserted: Handler<SimulationUpsertedEvent> = ({
  attributes,
  attributes: { origin, user, organisation, simulation },
}) => {
  if (!user.email) {
    return
  }

  const { email } = user

  if (organisation) {
    return sendPollSimulationUpsertedEmail({
      organisation,
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

  if (simulation) {
    return sendSimulationUpsertedEmail({
      email,
      origin,
      simulation,
    })
  }
}
