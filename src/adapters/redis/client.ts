import Redis from 'ioredis'
import { config } from '../../config'
import logger from '../../logger'

export const redisClientFactory = () =>
  new Redis(config.thirdParty.redis.url, {
    lazyConnect: true,
  }).on('error', (err) => {
    logger.error('Redis error', err)
    throw err
  })

export const redis = redisClientFactory()
