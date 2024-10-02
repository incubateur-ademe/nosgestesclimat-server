import { sendSimulationUpsertedEmail } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'

export const sendSimulationUpserted: Handler<SimulationUpsertedEvent> = ({
  attributes: {
    origin,
    simulation,
    simulation: {
      user: { email },
    },
  },
}) => {
  if (!email) {
    return
  }

  return sendSimulationUpsertedEmail({
    email,
    origin,
    simulation,
  })
}
