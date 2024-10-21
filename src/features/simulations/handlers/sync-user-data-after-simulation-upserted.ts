import type { Handler } from '../../../core/event-bus/handler'
import { syncUserData } from '../../users/users.service'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'

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
