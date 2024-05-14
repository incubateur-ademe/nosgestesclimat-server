import express from 'express'

import { Simulation } from '../../schemas/SimulationSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import mongoose from 'mongoose'
import { unformatSimulation } from '../../helpers/simulation/unformatSimulation'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId

  if (!simulationId) {
    return res
      .status(404)
      .send('Error. A simulation id or an email must be provided.')
  }

  const objectId = mongoose.isValidObjectId(simulationId)
    ? new mongoose.Types.ObjectId(simulationId)
    : simulationId

  try {
    const simulationFound = await Simulation.collection.findOne({
      $or: [{ _id: objectId }, { id: simulationId }],
    })

    if (!simulationFound) {
      return res.status(404).send('No matching simulation found.')
    }

    const simulationUnformatted = unformatSimulation(simulationFound.toObject())

    setSuccessfulJSONResponse(res)

    res.json(simulationUnformatted)
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error while fetching simulation.')
  }
})

export default router
