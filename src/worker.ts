import { redis } from './adapters/redis/client'
import { CHANNELS } from './adapters/redis/constant'
import logger from './logger'

redis.subscribe(CHANNELS.apiEvents, () => {
  console.log(`Worker listening  ${CHANNELS.apiEvents}`)
})

redis.on('message', (_, message) => {
  logger.info(`Received message: ${message}`)
})
