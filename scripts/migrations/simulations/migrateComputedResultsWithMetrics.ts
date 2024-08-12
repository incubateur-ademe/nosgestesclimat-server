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
      const defaultSubcategories = {
        alimentation: Object.assign({}),
        transport: Object.assign({}),
        logement: Object.assign({}),
        divers: Object.assign({}),
        'services sociétaux': Object.assign({}),
      }

      simulation.computedResults = {
        carbone: {
          ...(simulation.computedResults as MetricComputedResultsType),
          subcategories: defaultSubcategories,
        },
        eau: {
          bilan: 0,
          categories: {
            alimentation: 0,
            transport: 0,
            logement: 0,
            divers: 0,
            'services sociétaux': 0,
          },
          subcategories: defaultSubcategories,
        },
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
