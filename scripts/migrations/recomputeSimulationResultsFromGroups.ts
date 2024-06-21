import mongoose from 'mongoose'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'
import Engine from 'publicodes'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
// import { computeResults } from '../../src/helpers/simulation/computeResults'
import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// import { unformatSimulation } from '../../src/helpers/simulation/unformatSimulation'
//@ts-ignore
import { migrateSituation } from '@publicodes/tools/migration'

/**
 * This script is used to recompute the computed results of simulations (associated to a group) that have computedResults with the starting value. There was a bug on the frontend side
 * The helpers have been deleted because they are not in use anymore (and we don't want junior devs to use them)
 * It is supposed to be run in production on the 24/06/2024
 */
async function recomputeSimulationResults() {
  console.log('Start computed results migration')

  const migrationInstructions = JSON.parse(
    JSON.stringify(migrationInstructionsJSON)
  )

  let engine = new Engine(rules as unknown as NGCRules, {
    logger: {
      log: () => null,
      warn: () => null,
      error: console.error,
    },
  })

  mongoose.connect(config.mongo.url)

  try {
    const simulationsWithGroup = await Simulation.find({
      $and: [
        {
          $or: [
            { 'computedResults.bilan': { $eq: 0 } },
            { 'computedResults.bilan': { $gte: 8800, $lte: 9000 } },
          ],
        },
        { groups: { $exists: true, $type: 'array', $ne: [] } },
      ],
    })

    console.log('Simulations to migrate', simulationsWithGroup.length)

    let index = 0
    // for (let simulation of simulationsWithGroup) {
    //   const simulationUnformatted = unformatSimulation(simulation)

    //   const { situationMigrated } = migrateSituation({
    //     situation: simulationUnformatted.situation,
    //     migrationInstructions,
    //   })

    //   simulation.situation = situationMigrated

    //   simulation.computedResults = computeResults(situationMigrated, engine)

    //   await simulation.save()

    //   index++

    //   if (index % 100 === 0) {
    //     console.log(`Simulations migrated: ${index}.`, Date.now())
    //   }
    // }

    console.log('Simulations computed results migration done')
  } catch (error) {
    console.error('Error migrating simulations computed results', error)
  }
}

recomputeSimulationResults()
