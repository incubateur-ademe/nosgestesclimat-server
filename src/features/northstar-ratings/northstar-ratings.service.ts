import { transaction } from '../../adapters/prisma/transaction'
import type { NorthstarRatingCreateDto } from './northstar-ratings.validator'

export const createNorthStarRating = (
  northstarRating: NorthstarRatingCreateDto
) => {
  return transaction((prismaSession) =>
    prismaSession.northstarRating.upsert({
      where: {
        simulationId: northstarRating.simulationId,
      },
      create: northstarRating,
      update: northstarRating,
    })
  )
}
