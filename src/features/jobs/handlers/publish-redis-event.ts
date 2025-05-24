import { redis } from '../../../adapters/redis/client'
import { CHANNELS } from '../../../adapters/redis/constant'
import type { Handler } from '../../../core/event-bus/handler'
import type { JobCreatedEvent } from '../events/JobCreated.event'
import { JobCreatedAsyncEvent } from '../events/JobCreated.event'

export const publishRedisEvent: Handler<JobCreatedEvent> = ({ attributes }) => {
  return redis.publish(
    CHANNELS.apiEvents,
    JSON.stringify(new JobCreatedAsyncEvent(attributes))
  )
}
