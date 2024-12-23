import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// @ts-expect-error Typing error in the library
import { migrateSituation } from '@publicodes/tools/migration'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import { Organisation } from '../../../src/schemas/OrganisationSchema'
import type { LeanSimulationType } from '../../../src/schemas/SimulationSchema'
import { Simulation } from '../../../src/schemas/SimulationSchema'
import { fullComputeResults } from './computeResults'
/**
 * This script find all poll simulations without carbon subcategories and without water computedResults
 * and compute them
 */
async function migrateOrganisationsComputeAllResults() {
  console.log('Start organisations simulations computedResults migration')

  mongoose.connect(config.mongo.url)

  try {
    const simulations = Organisation.aggregate<LeanSimulationType[]>([
      {
        $unwind: '$polls',
      },
      {
        $lookup: {
          from: 'polls',
          localField: 'polls',
          foreignField: '_id',
          as: 'polls',
        },
      },
      {
        $unwind: '$polls',
      },
      {
        $unwind: '$polls.simulations',
      },
      {
        $lookup: {
          from: 'simulations',
          localField: 'polls.simulations',
          foreignField: '_id',
          as: 'polls.simulations',
        },
      },
      {
        $unwind: '$polls.simulations',
      },
      {
        $match: {
          $or: [
            // No computedResults
            { 'polls.simulations.computedResults': {} },
            { 'polls.simulations.computedResults': null },
            { 'polls.simulations.computedResults': { $exists: false } },
            // No carbon subcategories
            { 'polls.simulations.computedResults.carbone.subcategories': {} },
            { 'polls.simulations.computedResults.carbone.subcategories': null },
            {
              'polls.simulations.computedResults.carbone.subcategories': {
                $exists: false,
              },
            },
            // No water computedResults
            { 'polls.simulations.computedResults.eau': {} },
            { 'polls.simulations.computedResults.eau': null },
            { 'polls.simulations.computedResults.eau': { $exists: false } },
            // No water subcategories
            { 'polls.simulations.computedResults.eau.subcategories': {} },
            { 'polls.simulations.computedResults.eau.subcategories': null },
            {
              'polls.simulations.computedResults.eau.subcategories': {
                $exists: false,
              },
            },
          ],
        },
      },
      {
        $replaceRoot: { newRoot: '$polls.simulations' },
      },
    ]).cursor()

    console.log('Start computing results')

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

migrateOrganisationsComputeAllResults()
