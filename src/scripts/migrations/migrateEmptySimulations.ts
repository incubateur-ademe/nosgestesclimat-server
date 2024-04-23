import mongoose from 'mongoose'
import { Simulation } from '../../schemas/SimulationSchema'
import { config } from '../../config'

async function migrateEmptySimulations() {
  console.log('Start deletion of empty simulations')
  mongoose.connect(config.mongo.url)
  try {
    await Simulation.deleteMany({
      situation: { $exists: false },
    })

    console.log('Empty simulations deletion done')
  } catch (error) {
    console.error('Error deleting empty simulation', error)
  }
}

migrateEmptySimulations()
