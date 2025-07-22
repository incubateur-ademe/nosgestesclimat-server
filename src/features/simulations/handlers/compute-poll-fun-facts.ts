import type { Handler } from '../../../core/event-bus/handler.js'
import { updatePollFunFactsAfterSimulationChange } from '../../organisations/organisations.service.js'
import type { SimulationUpsertedAsyncEvent } from '../events/SimulationUpserted.event.js'

export const computePollFunFacts: Handler<SimulationUpsertedAsyncEvent> = ({
  attributes: { simulation, created },
}) => {
  return updatePollFunFactsAfterSimulationChange({ simulation, created })
}
