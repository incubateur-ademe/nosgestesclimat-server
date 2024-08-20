import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'
import { unformatSituation } from '../../src/utils/formatting/unformatSituation'

/**
 * This script migrates the situation format of all simulations. They were previously encoded but we apparently cannot manage it correctly.
 * It is supposed to be run in production on the 24/06/2024
 */
async function migrateSituationFormat() {
  console.log('Start situation format migration')

  mongoose.connect(config.mongo.url)

  const numberOfSimulations = await Simulation.countDocuments()

  console.log('Simulations to migrate', numberOfSimulations)

  try {
    for (let cursor = 0; cursor < numberOfSimulations; cursor += 10000) {
      console.log('Next simulation batch migration started.')
      const simulations = await Simulation.find()
        .skip(cursor)
        .limit(10000)
        .exec()

      let index = 0
      for (const simulation of simulations) {
        simulation.situation = unformatSituation({ ...simulation.situation })

        await simulation.save()

        index++

        if (index % 100 === 0) {
          console.log(`Simulations migrated: ${cursor + index}.`, Date.now())
        }
      }
    }

    console.log('Simulations situation format migration done')
  } catch (error) {
    console.error('Error migrating simulations situation format', error)
  }
}

migrateSituationFormat()
