import { EventBusEvent } from '../../../core/event-bus/event'
import type {
  createPollUserSimulation,
  createUserSimulation,
} from '../simulations.repository'

export class SimulationUpsertedEvent extends EventBusEvent<{
  simulation: Awaited<ReturnType<typeof createUserSimulation>>
  organisation?: Awaited<
    ReturnType<typeof createPollUserSimulation>
  >['organisation']
  origin: string
}> {}
