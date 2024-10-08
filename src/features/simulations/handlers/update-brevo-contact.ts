import { addOrUpdateContactAfterSimulationCreated } from '../../../adapters/brevo/client'
import type { Handler } from '../../../core/event-bus/handler'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'
import type {
  ActionChoicesSchema,
  ComputedResultSchema,
} from '../simulations.validator'

export const updateBrevoContact: Handler<SimulationUpsertedEvent> = ({
  attributes: {
    simulation: {
      progression,
      actionChoices,
      computedResults,
      date: lastSimulationDate,
    },
    user: { id: userId, email, name },
  },
}) => {
  if (!email || progression !== 1) {
    return
  }

  return addOrUpdateContactAfterSimulationCreated({
    name,
    email,
    userId,
    actionChoices: actionChoices as ActionChoicesSchema,
    computedResults: computedResults as ComputedResultSchema,
    lastSimulationDate,
  })
}
