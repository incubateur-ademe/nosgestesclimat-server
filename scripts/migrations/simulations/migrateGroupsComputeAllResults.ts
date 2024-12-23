import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// @ts-expect-error Typing error in the library
import { migrateSituation } from '@publicodes/tools/migration'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import { Group } from '../../../src/schemas/GroupSchema'
import type { LeanSimulationType } from '../../../src/schemas/SimulationSchema'
import { Simulation } from '../../../src/schemas/SimulationSchema'
import { fullComputeResults } from './computeResults'

/**
 * This script find all group simulations without carbon subcategories and without water computedResults
 * and compute them
 */
async function migrateGroupsComputeAllResults() {
  console.log('Start groups simulations computedResults migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = Group.aggregate<LeanSimulationType[]>([
      {
        $unwind: '$participants',
      },
      {
        $lookup: {
          from: 'simulations',
          localField: 'participants.simulation',
          foreignField: '_id',
          as: 'participants.simulation',
        },
      },
      {
        $unwind: '$participants.simulation',
      },
      {
        $match: {
          $or: [
            // No computedResults
            { 'participants.simulation.computedResults': {} },
            { 'participants.simulation.computedResults': null },
            { 'participants.simulation.computedResults': { $exists: false } },
            // No carbon subcategories
            {
              'participants.simulation.computedResults.carbone.subcategories':
                {},
            },
            {
              'participants.simulation.computedResults.carbone.subcategories':
                null,
            },
            {
              'participants.simulation.computedResults.carbone.subcategories': {
                $exists: false,
              },
            },
            // No water computedResults
            { 'participants.simulation.computedResults.eau': {} },
            { 'participants.simulation.computedResults.eau': null },
            {
              'participants.simulation.computedResults.eau': { $exists: false },
            },
            // No water subcategories
            { 'participants.simulation.computedResults.eau.subcategories': {} },
            {
              'participants.simulation.computedResults.eau.subcategories': null,
            },
            {
              'participants.simulation.computedResults.eau.subcategories': {
                $exists: false,
              },
            },
          ],
        },
      },
      {
        $replaceRoot: { newRoot: '$participants.simulation' },
      },
    ]).cursor()

    let updated = 0
    for await (const simulation of simulations) {
      const situationMigrated = migrateSituation(
        simulation.situation,
        migrationInstructionsJSON
      )

      const computedResults = fullComputeResults(situationMigrated)

      const { modifiedCount } = await Simulation.updateOne(
        {
          _id: simulation._id,
          updatedAt: simulation.updatedAt,
        },
        {
          $set: { computedResults },
        }
      )

      updated += modifiedCount

      if (updated % 100 === 0) {
        console.log('Updated simulations', updated)
      }
    }

    console.log('Computed results migration done. Updated simulations', updated)
  } catch (error) {
    console.error('Error migrating computed results', error)
  } finally {
    mongoose.disconnect()
  }
}

migrateGroupsComputeAllResults()
