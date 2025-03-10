import type { Handler } from '../../../core/event-bus/handler'
import { updatePollFunFacts } from '../../organisations/organisations.service'
import type { SimulationUpsertedAsyncEvent } from '../events/SimulationUpserted.event'

export const computePollFunFacts: Handler<SimulationUpsertedAsyncEvent> = ({
  attributes: {
    simulation: { id },
  },
}) => {
  return updatePollFunFacts(id)
}
