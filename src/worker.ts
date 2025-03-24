import { redis } from './adapters/redis/client'
import { CHANNELS } from './adapters/redis/constant'
import { EventBus } from './core/event-bus/event-bus'
import { SimulationUpsertedAsyncEvent } from './features/simulations/events/SimulationUpserted.event'
import { computePollFunFacts } from './features/simulations/handlers/compute-poll-fun-facts'
import logger from './logger'

const RedisApiEventMap = {
  SimulationUpsertedAsyncEvent,
} as const

EventBus.on(SimulationUpsertedAsyncEvent, computePollFunFacts)

const parseMessage = (message: string) => {
  const { name, attributes } = JSON.parse(message)

  return new RedisApiEventMap[name as keyof typeof RedisApiEventMap](attributes)
}

redis.subscribe(CHANNELS.apiEvents, () => {
  console.log(`Worker listening  ${CHANNELS.apiEvents}`)
})

redis.on('message', async (_, message) => {
  try {
    const event = parseMessage(message)

    EventBus.emit(event)

    await EventBus.once(event)
    logger.info('Handled event', { event })
  } catch (err) {
    logger.error('Redis api event failure', err)
  }
})
