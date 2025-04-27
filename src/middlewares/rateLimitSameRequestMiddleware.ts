import crypto from 'crypto'
import type { RequestHandler } from 'express'
import { StatusCodes } from 'http-status-codes'
import { redis } from '../adapters/redis/client'
import { KEYS } from '../adapters/redis/constant'
import logger from '../logger'

export const rateLimitSameRequestMiddleware: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { method, url, requestParams } = req

    const requestHash = crypto
      .createHash('sha256')
      .update(`${method}_${url}_${requestParams}`)
      .digest('hex')

    const redisKey = `${KEYS.rateLimitSameRequests}_${requestHash}`

    const currentRequest = await redis.get(redisKey)

    if (currentRequest) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        message: 'Too many requests',
      })
    }

    await redis.set(redisKey, requestHash)
    await redis.expire(redisKey, 2)
  } catch (error) {
    logger.warn('Could not rate limit same requests', error)
  }

  return next()
}
