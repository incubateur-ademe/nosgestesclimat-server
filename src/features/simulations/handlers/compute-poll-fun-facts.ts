import type { Handler } from '../../../core/event-bus/handler'
import { updatePollFunFactsAfterSimulationChange } from '../../organisations/organisations.service'
import type { SimulationUpsertedAsyncEvent } from '../events/SimulationUpserted.event'

export const computePollFunFacts: Handler<SimulationUpsertedAsyncEvent> = ({
  attributes: { simulation, created },
}) => {
  return updatePollFunFactsAfterSimulationChange({ simulation, created })
}
