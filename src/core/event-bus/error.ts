import type { EventBusEvent } from './event'
import type { Handler } from './handler'

export type EventBusErrorReason<FinishedEvent extends EventBusEvent> = {
  event: FinishedEvent
  errors: Array<{
    handler: Handler<FinishedEvent>
    error: Error
  }>
}

export class EventBusError<FinishedEvent extends EventBusEvent> extends Error {
  constructor(public reasons: EventBusErrorReason<FinishedEvent>[]) {
    super()
  }
}
