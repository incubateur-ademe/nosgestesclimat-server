import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import type { NorthstarRatingEnum } from '../../features/northstar-ratings/northstar-ratings.validator'
import logger from '../../logger'
import { NorthstarRating } from '../../schemas/NorthstarRatingSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Create a new northstar rating
 * It requires a simulationId, a value, and a type
 * It returns the rating object
 */
router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId
  const value = req.body.value
  const type: NorthstarRatingEnum = req.body.type

  // If no simulationId, value or type is provided, we return an error
  if (!simulationId) {
    return res.status(500).send('Error. A simulationId must be provided.')
  }
  if (!value) {
    return res.status(500).send('Error. A value must be provided.')
  }
  if (!type) {
    return res.status(500).send('Error. A type must be provided.')
  }

  try {
    // We create and save a new northstar value
    const northstarRating = new NorthstarRating({
      value,
      type,
      simulationId,
    })

    await northstarRating.save()

    try {
      await prisma.northstarRating.upsert({
        where: {
          simulationId,
        },
        create: {
          id: northstarRating._id.toString(),
          simulationId,
          type,
          value: +value,
        },
        update: {
          simulationId,
          type,
          value: +value,
        },
      })
    } catch (error) {
      logger.error('postgre NothstarRatings replication failed', error)
    }

    setSuccessfulJSONResponse(res)

    res.json(northstarRating)

    console.log(`Northstar rating created: ${northstarRating._id}`)
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while creating northstar value.')
  }
})

/**
 * @deprecated should use features/northstar-ratings instead
 */
export default router
