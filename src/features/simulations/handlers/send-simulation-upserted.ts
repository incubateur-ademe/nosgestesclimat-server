import {
  sendPollSimulationUpsertedEmail,
  sendSimulationUpsertedEmail,
} from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'

export const sendSimulationUpserted: Handler<SimulationUpsertedEvent> = ({
  attributes: {
    origin,
    simulation,
    simulation: {
      user: { email },
    },
    organisation,
  },
}) => {
  if (!email) {
    return
  }

  if (organisation) {
    return sendPollSimulationUpsertedEmail({
      organisation,
      origin,
      email,
    })
  }

  return sendSimulationUpsertedEmail({
    email,
    origin,
    simulation,
  })
}
