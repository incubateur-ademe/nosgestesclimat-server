import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'
import { unformatSituation } from '../../src/utils/formatting/unformatSituation'

async function migrateSituationFormat() {
  console.log('Start situation format migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = await Simulation.find()

    console.log('Simulations to migrate', simulations.length)

    let index = 0
    for (const simulation of simulations) {
      simulation.situation = unformatSituation({ ...simulation.situation })

      await simulation.save()

      index++

      if (index % 100 === 0) {
        console.log(`Simulations migrated: ${index}.`, Date.now())
      }
    }

    console.log('Simulations situation format migration done')
  } catch (error) {
    console.error('Error migrating simulations situation format', error)
  }
}

migrateSituationFormat()
