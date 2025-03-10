import { redis } from '../../../adapters/redis/client'
import { CHANNELS } from '../../../adapters/redis/constant'
import type { Handler } from '../../../core/event-bus/handler'
import type { SimulationUpsertedEvent } from '../events/SimulationUpserted.event'
import { SimulationUpsertedAsyncEvent } from '../events/SimulationUpserted.event'

export const publishRedisEvent: Handler<SimulationUpsertedEvent> = ({
  attributes,
}) => {
  return redis.publish(
    CHANNELS.apiEvents,
    JSON.stringify(new SimulationUpsertedAsyncEvent(attributes))
  )
}
