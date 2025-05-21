import { isAxiosError } from 'axios'
import { z } from 'zod'
import {
  fetchNewsletter,
  isNotFound,
  isTimeout,
} from '../../adapters/brevo/client'
import { redis } from '../../adapters/redis/client'
import { ALIVE_SUFFIX, KEYS } from '../../adapters/redis/constant'
import type { NewsletterParams } from './newsletter.validator'

const BREVO_NEWSLETTER_REDIS_CACHE_TTL_SECONDS = 60

const BrevoNewsLetterDtoSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    totalSubscribers: z.number(),
  })
  .strict()

export const fetchBrevoNewsletter = async (params: NewsletterParams) => {
  const redisKey = `${KEYS.brevoNewsletter}_${params.newsletterId}`

  try {
    const {
      status,
      data: { id, name, totalSubscribers },
    } = await fetchNewsletter(params.newsletterId)

    const body = BrevoNewsLetterDtoSchema.parse({ id, name, totalSubscribers })

    await redis.set(redisKey, JSON.stringify(body))

    return {
      status,
      body,
    }
  } catch (e) {
    if (isAxiosError(e)) {
      if (isNotFound(e)) {
        return {
          status: e.response.status,
          body: e.response.data,
        }
      }

      if (isTimeout(e)) {
        const cache = await redis.get(redisKey)

        if (cache) {
          return {
            status: 200,
            body: JSON.parse(cache),
          }
        }
      }
    }

    throw e
  } finally {
    await redis.set(`${redisKey}${ALIVE_SUFFIX}`, 'true')
    await redis.expire(
      `${redisKey}${ALIVE_SUFFIX}`,
      BREVO_NEWSLETTER_REDIS_CACHE_TTL_SECONDS
    )
  }
}
