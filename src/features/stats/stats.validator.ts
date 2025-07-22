import { z } from 'zod'
import { PERIODS } from '../../constants/period.js'

export const NorthstarStatsFetchQuery = z
  .object({
    periodicity: z.nativeEnum(PERIODS).default(PERIODS.month),
    since: z.coerce.number().int().positive().default(Number.MAX_VALUE),
  })
  .strict()

export type NorthstarStatsFetchQuery = z.infer<typeof NorthstarStatsFetchQuery>

export const NorthstarStatsFetchValidator = {
  body: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
  query: NorthstarStatsFetchQuery,
}
