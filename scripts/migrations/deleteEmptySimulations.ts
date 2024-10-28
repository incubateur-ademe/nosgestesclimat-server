import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'

/**
 * This script deletes all simulations that have no foldedSteps or situation (they were created with every northstar rating)
 * It is supposed to be run in production on the 24/06/2024
 */
async function deleteEmptySimulations() {
  console.log('Start removal of empty simulations')
  mongoose.connect(config.mongo.url)
  try {
    await Simulation.deleteMany({
      $or: [
        { foldedSteps: { $exists: false } },
        { situation: { $exists: false } },
      ],
    })

    console.log('Empty simulations deleted')
  } catch (error) {
    console.error('Error deleting empty simulations', error)
  }
}

deleteEmptySimulations()
