import { isAxiosError } from 'axios'
import { z } from 'zod'
import { fetchNewsletter, isNotFound } from '../../adapters/brevo/client'
import type { NewsletterParams } from './newsletter.validator'

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

    return {
      status,
      body: BrevoNewsLetterDtoSchema.parse({ id, name, totalSubscribers }),
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
