import type { AnyBulkWriteOperation } from 'mongodb'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import type { SimulationType } from '../../../src/schemas/SimulationSchema'
import { Simulation } from '../../../src/schemas/SimulationSchema'

type ProjectedSimulation = Pick<SimulationType, '_id' | 'computedResults'>

/**
 * This script migrates the computed results format of all simulations to add metrics (carbone, eau, etc.)
 * It is supposed to be run in production on the 21/08/2024
 */
async function migrateComputedResults() {
  console.log('Start computed results migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = Simulation.find<ProjectedSimulation>(
      {
        computedResults: { $exists: true },
        'computedResults.bilan': { $exists: true },
      },
      { computedResults: true }
    )
      .lean()
      .cursor({ batch: 1000 })

    let updated = 0
    const bulkWrites: AnyBulkWriteOperation[] = []

    for await (const simulation of simulations) {
      // Should not happen but just in case
      if (!simulation.computedResults) {
        continue
      }

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
        console.log('Updated simulations', updated)
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
