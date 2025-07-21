import { NorthstarRatingType } from '@prisma/client'
import { z } from 'zod'

export const NorthstarRatingCreateDto = z.object({
  simulationId: z.string().uuid(),
  value: z.number().min(0).max(5),
  type: z.nativeEnum(NorthstarRatingType),
})

export type NorthstarRatingCreateDto = z.infer<typeof NorthstarRatingCreateDto>

export const NorthstarRatingCreateValidator = {
  body: NorthstarRatingCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
