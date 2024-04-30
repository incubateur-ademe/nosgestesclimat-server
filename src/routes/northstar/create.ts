import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { NorthstarRating } from '../../schemas/NorthstarSchema'

const router = express.Router()

/**
 * Create a new northstar rating
 * It requires a simulationId, a value, and a type
 * It returns the rating object
 */
router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId
  const value = req.body.value
  const type = req.body.type

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

    setSuccessfulJSONResponse(res)

    res.json(northstarRating)

    console.log(`Northstar rating created: ${northstarRating._id}`)
  } catch (error) {
    return res.status(500).send('Error while creating northstar value.')
  }
})

export default router
