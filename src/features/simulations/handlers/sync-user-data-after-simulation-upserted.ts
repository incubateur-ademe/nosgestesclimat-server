import type { Handler } from '../../../core/event-bus/handler.js'
import { syncUserData } from '../../users/users.service.js'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event.js'

export const syncUserDataAfterSimulationUpserted: Handler<
  SimulationUpsertedEvent
> = ({
  attributes: {
    user: { email, id: userId },
  },
}) => {
  if (!email) {
    return
  }

  return syncUserData({
    userId,
    email,
  })
}
