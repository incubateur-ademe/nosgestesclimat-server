import { transaction } from '../../adapters/prisma/transaction.js'
import type { NorthstarRatingCreateDto } from './northstar-ratings.validator.js'

export const createNorthStarRating = (
  northstarRating: NorthstarRatingCreateDto
) => {
  return transaction((session) =>
    session.northstarRating.upsert({
      where: {
        simulationId: northstarRating.simulationId,
      },
      create: northstarRating,
      update: northstarRating,
    })
  )
}
