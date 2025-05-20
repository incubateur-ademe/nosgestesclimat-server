import { EventBusEvent } from '../../../core/event-bus/event'

export class JobCreatedEvent extends EventBusEvent<{
  jobId: string
}> {
  name = 'JobCreatedEvent'
}

export class JobCreatedAsyncEvent extends EventBusEvent<{
  jobId: string
}> {
  name = 'JobCreatedAsyncEvent'
}
