import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// @ts-expect-error Typing error in the library
import { migrateSituation } from '@publicodes/tools/migration'
import express from 'express'
import mongoose from 'mongoose'
import { computeResults } from '../../helpers/simulation/computeResults'
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
    let simulationFound = await Simulation.findOne(searchQuery)

    if (!simulationFound) {
      return res.status(404).send('No matching simulation found.')
    }

    if (
      !simulationFound.computedResults ||
      !simulationFound.computedResults.carbone
    ) {
      const situationMigrated = migrateSituation(
        simulationFound.situation,
        migrationInstructionsJSON
      )

      const computedResults = computeResults(situationMigrated)

      simulationFound = await Simulation.findByIdAndUpdate(
        simulationFound._id,
        {
          computedResults: {
            carbone: computedResults,
          },
        },
        { new: true }
      )
    }

    setSuccessfulJSONResponse(res)

    res.json(simulationFound)
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error while fetching simulation.')
  }
})

export default router
