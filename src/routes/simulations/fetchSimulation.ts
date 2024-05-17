import express from 'express'

import { Simulation, SimulationType } from '../../schemas/SimulationSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import mongoose, { HydratedDocument } from 'mongoose'
import { unformatSimulation } from '../../helpers/simulation/unformatSimulation'
import { handleComputeResultsIfNone } from '../../helpers/simulation/handleComputeResultsIfNone'

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
    const simulationFound = await Simulation.findOne(searchQuery)

    if (!simulationFound) {
      return res.status(404).send('No matching simulation found.')
    }

    const migratedSimulation = handleComputeResultsIfNone(simulationFound)

    setSuccessfulJSONResponse(res)

    res.json(migratedSimulation)
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error while fetching simulation.')
  }
})

export default router
