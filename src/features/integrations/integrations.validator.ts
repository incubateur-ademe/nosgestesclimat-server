import z from 'zod'
import { SituationSchema } from '../simulations/simulations.validator'

export enum ExternalServiceTypeEnum {
  agir = 'agir',
  '2-tonnes' = '2-tonnes',
}

const ExternalServiceType = z.nativeEnum(ExternalServiceTypeEnum)

const SituationExportParamsSchema = z
  .object({
    externalService: ExternalServiceType,
  })
  .strict()

export type SituationExportParamsSchema = z.infer<
  typeof SituationExportParamsSchema
>

const partnerPrefix = 'partner-'

const SituationExportQueryParamsSchema = z
  .record(
    z.union([
      z.array(z.string().nullable()),
      z.number().nullable(),
      z.string().nullable(),
      z.boolean().nullable(),
    ])
  )
  .refine(
    (data) => Object.keys(data).every((key) => key.startsWith(partnerPrefix)),
    {
      message: `Each key must start with the prefix '${partnerPrefix}*'`,
    }
  )

export type SituationExportQueryParamsSchema = z.infer<
  typeof SituationExportQueryParamsSchema
>

export const SituationExportValidator = {
  body: SituationSchema,
  params: SituationExportParamsSchema,
  query: SituationExportQueryParamsSchema,
}
