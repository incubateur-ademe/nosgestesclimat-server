import { z } from 'zod'

const NewsletterParams = z
  .object({
    newsletterId: z.coerce.number(),
  })
  .strict()

export type NewsletterParams = z.infer<typeof NewsletterParams>

export const NewsletterFetchValidator = {
  body: z.object({}).strict().optional(),
  params: NewsletterParams,
  query: z.object({}).strict().optional(),
}
