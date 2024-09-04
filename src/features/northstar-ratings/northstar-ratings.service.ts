import { prisma } from '../../adapters/prisma/client'
import type { NorthstarRatingCreateDto } from './northstar-ratings.validator'

export const createNorthStarRating = (
  northstarRating: NorthstarRatingCreateDto
) => {
  return prisma.northstarRating.upsert({
    where: {
      simulationId: northstarRating.simulationId,
    },
    create: northstarRating,
    update: northstarRating,
  })
}
