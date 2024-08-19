import mongoose from 'mongoose'
import {
  Simulation,
  MetricComputedResultsType,
} from '../../../src/schemas/SimulationSchema'
import { config } from '../../../src/config'

async function migrateComputedResults() {
  console.log('Start computed results migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = Simulation.find({
      'computedResults.bilan': { $exists: true },
    }).cursor({ batch: 1000 })

    for await (let simulation of simulations) {
      simulation.computedResults = {
        carbone: simulation.computedResults as MetricComputedResultsType,
      }

      await simulation.save()
    }

    console.log('Computed results migration done')
  } catch (error) {
    console.error('Error migrating computed results', error)
  } finally {
    mongoose.disconnect()
  }
}

migrateComputedResults()
