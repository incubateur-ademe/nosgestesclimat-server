import { EventBusEvent } from '../../../core/event-bus/event'

export class JobStartedEvent extends EventBusEvent<{
  jobId: string
}> {
  name = 'JobStartedEvent'
}

export class JobStartedAsyncEvent extends EventBusEvent<{
  jobId: string
}> {
  name = 'JobStartedAsyncEvent'
}
