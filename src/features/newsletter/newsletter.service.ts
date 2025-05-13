import { isAxiosError } from 'axios'
import { z } from 'zod'
import { fetchNewsletter, isNotFound } from '../../adapters/brevo/client'
import { redis } from '../../adapters/redis/client'
import { KEYS } from '../../adapters/redis/constant'
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
  try {
    const {
      status,
      data: { id, name, totalSubscribers },
    } = await fetchNewsletter(params.newsletterId)

    const body = BrevoNewsLetterDtoSchema.parse({ id, name, totalSubscribers })

    const redisKey = `${KEYS.brevoNewsletter}_${params.newsletterId}`
    await redis.set(redisKey, JSON.stringify(body))
    await redis.expire(redisKey, BREVO_NEWSLETTER_REDIS_CACHE_TTL_SECONDS)

    return {
      status,
      body,
    }
  } catch (e) {
    if (isAxiosError(e) && isNotFound(e)) {
      return {
        status: e.response.status,
        body: e.response.data,
      }
    }
    throw e
  }
}
