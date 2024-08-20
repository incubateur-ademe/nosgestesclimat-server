import { AnyBulkWriteOperation } from 'mongodb'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import {
  Simulation,
  SimulationType,
} from '../../../src/schemas/SimulationSchema'

type ProjectedSimulation = Pick<SimulationType, '_id' | 'computedResults'>

async function migrateComputedResults() {
  console.log('Start computed results migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = Simulation.find<ProjectedSimulation>(
      {
        'computedResults.bilan': { $exists: true },
      },
      { computedResults: true }
    )
      .lean()
      .cursor({ batch: 1000 })

    let updated = 0
    const bulkWrites: AnyBulkWriteOperation[] = []

    for await (let simulation of simulations) {
      bulkWrites.push({
        updateOne: {
          filter: {
            _id: simulation._id,
          },
          update: {
            $set: {
              computedResults: {
                carbone: simulation.computedResults,
              },
            },
          },
        },
      })

      if (bulkWrites.length >= 1000) {
        const { modifiedCount } = await Simulation.bulkWrite(bulkWrites)
        updated += modifiedCount
        bulkWrites.length = 0
      }
    }

    const { modifiedCount } = await Simulation.bulkWrite(bulkWrites)
    updated += modifiedCount
    bulkWrites.length = 0

    console.log('Computed results migration done. Updated simulations', updated)
  } catch (error) {
    console.error('Error migrating computed results', error)
  } finally {
    mongoose.disconnect()
  }
}

migrateComputedResults()
