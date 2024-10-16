import express from 'express'
import mongoose from 'mongoose'
import type { PollType } from '../../schemas/PollSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import { Simulation } from '../../schemas/SimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId

  if (!simulationId) {
    return res
      .status(404)
      .send('Error. A simulation id or an email must be provided.')
  }

  const isValidObjectId = mongoose.isValidObjectId(simulationId)

  const searchQuery = isValidObjectId
    ? { _id: new mongoose.Types.ObjectId(simulationId) }
    : { id: simulationId }

  try {
    const simulationFound = await Simulation.findOne<
      Omit<SimulationType, 'polls'> & { polls: PollType[] }
    >(searchQuery).populate('polls')

    if (!simulationFound) {
      return res.status(404).send('No matching simulation found.')
    }

    setSuccessfulJSONResponse(res)

    res.json({
      ...simulationFound.toObject(),
      polls: simulationFound.polls.map(({ slug }) => slug),
    })
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error while fetching simulation.')
  }
})

/**
 * @deprecated should use features/simulations instead
 */
export default router
