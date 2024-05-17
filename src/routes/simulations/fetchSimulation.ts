import express from 'express'
import { Simulation } from '../../schemas/SimulationSchema'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import mongoose from 'mongoose'
import { handleComputeResultsIfNone } from '../../helpers/simulation/handleComputeResultsIfNone'
import Engine from 'publicodes'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'

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

    const engine = new Engine(rules as unknown as NGCRules, {
      logger: {
        log: console.log,
        warn: () => null,
        error: console.error,
      },
    })

    const migratedSimulation = handleComputeResultsIfNone(
      simulationFound,
      engine
    )

    setSuccessfulJSONResponse(res)

    res.json(migratedSimulation)
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error while fetching simulation.')
  }
})

export default router
