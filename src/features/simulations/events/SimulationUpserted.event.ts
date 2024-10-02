import { EventBusEvent } from '../../../core/event-bus/event'
import type { createUserSimulation } from '../simulations.repository'

export class SimulationUpsertedEvent extends EventBusEvent<{
  simulation: Awaited<ReturnType<typeof createUserSimulation>>
  origin: string
}> {}
