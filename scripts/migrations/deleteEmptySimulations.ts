import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'

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
