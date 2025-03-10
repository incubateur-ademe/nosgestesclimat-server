import { redis } from '../adapters/redis/client'
import { CHANNELS } from '../adapters/redis/constant'
import type { EventBusEvent } from './event-bus/event'

export const publishApiEvent = async (event: EventBusEvent) => {
  redis.publish(CHANNELS.apiEvents, JSON.stringify(event))
}
