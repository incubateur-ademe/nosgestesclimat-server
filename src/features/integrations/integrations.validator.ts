import z from 'zod'
import { SituationSchema } from '../simulations/simulations.validator'

const SituationExportParams = z
  .object({
    externalService: z.enum(['agir']),
  })
  .strict()

export type SituationExportParams = z.infer<typeof SituationExportParams>

export const SituationExportValidator = {
  body: SituationSchema,
  params: SituationExportParams,
  query: z.object({}).strict().optional(),
}
