import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// @ts-expect-error Typing error in the library
import { migrateSituation } from '@publicodes/tools/migration'
import type { AnyBulkWriteOperation } from 'mongodb'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import { Poll } from '../../../src/schemas/PollSchema'
import type { LeanSimulationType } from '../../../src/schemas/SimulationSchema'
import { Simulation } from '../../../src/schemas/SimulationSchema'
import { computeResults } from './computeResults'

/**
 * This script find all polls simulations without computedResults
 * or empty computedResults and compute them
 */
async function migratePollsEmptyComputedResults() {
  console.log('Start polls empty computedResults migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = Poll.aggregate<LeanSimulationType[]>([
      { $unwind: '$simulations' },
      {
        $lookup: {
          from: 'simulations',
          localField: 'simulations',
          foreignField: '_id',
          as: 'simulations',
        },
      },
      { $unwind: '$simulations' },
      {
        $match: {
          $or: [
            { 'simulations.computedResults': {} },
            { 'simulations.computedResults': null },
            { 'simulations.computedResults': { $exists: false } },
          ],
        },
      },
      { $replaceRoot: { newRoot: '$simulations' } },
    ]).cursor()

    let updated = 0
    const bulkWrites: AnyBulkWriteOperation[] = []

    for await (const simulation of simulations) {
      const situationMigrated = migrateSituation(
        simulation.situation,
        migrationInstructionsJSON
      )

      const computedResults = computeResults(situationMigrated)

      bulkWrites.push({
        updateOne: {
          filter: {
            _id: simulation._id,
          },
          update: {
            $set: {
              computedResults: {
                carbone: computedResults,
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

    if (bulkWrites.length) {
      const { modifiedCount } = await Simulation.bulkWrite(bulkWrites)
      updated += modifiedCount
      bulkWrites.length = 0
    }

    console.log('Computed results migration done. Updated simulations', updated)
  } catch (error) {
    console.error('Error migrating computed results', error)
  } finally {
    mongoose.disconnect()
  }
}

migratePollsEmptyComputedResults()
