import z from 'zod'

export enum NorthstarRatingTypeEnum {
  actions = 'actions',
  learned = 'learned',
}

const NorthstarRatingType = z.enum([
  NorthstarRatingTypeEnum.actions,
  NorthstarRatingTypeEnum.learned,
])

export const NorthstarRatingCreateDto = z.object({
  simulationId: z.string().uuid(),
  value: z.number().min(0).max(5),
  type: NorthstarRatingType,
})

export type NorthstarRatingCreateDto = z.infer<typeof NorthstarRatingCreateDto>

export const NorthstarRatingCreateValidator = {
  body: NorthstarRatingCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
