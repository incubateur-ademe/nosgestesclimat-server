import z from 'zod'

export enum NorthstarRatingEnum {
  actions = 'actions',
  learned = 'learned',
}

const NorthstarRatingType = z.enum([
  NorthstarRatingEnum.actions,
  NorthstarRatingEnum.learned,
])

export const NorthstarRatingCreateDto = z.object({
  simulationId: z.string().uuid(),
  value: z.number().min(0).max(5),
  type: NorthstarRatingType,
})

export const NorthstarRatingCreateValidator = {
  body: NorthstarRatingCreateDto,
}
