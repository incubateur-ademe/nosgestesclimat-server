// import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// import { migrateSituation } from '@publicodes/tools/migration'
import mongoose from 'mongoose'
//import Engine from 'publicodes'
// import { computeResults } from '../../src/helpers/simulation/computeResults'
// import { unformatSimulation } from '../../src/helpers/simulation/unformatSimulation'
import { config } from '../../src/config'
import { Simulation } from '../../src/schemas/SimulationSchema'

/**
 * This script is used to recompute the computed results of simulations that have computedResults of 0. There was a bug on the frontend side
 * The helpers have been deleted because they are not in use anymore (and we don't want junior devs to use them)
 * It is supposed to be run in production on the 24/06/2024
 */
async function recomputeEmptySimulationResults() {
  console.log('Start computed results migration')

  // const migrationInstructions = JSON.parse(
  //   JSON.stringify(migrationInstructionsJSON)
  // )

  mongoose.connect(config.mongo.url)

  try {
    const simulationsWithPollOrGroup = await Simulation.find({
      'computedResults.bilan': { $eq: 0 },
    })

    console.log('Simulations to migrate', simulationsWithPollOrGroup.length)

    // let index = 0
    // for (let simulation of simulationsWithPollOrGroup) {
    //   const simulationUnformatted = unformatSimulation(simulation)

    //   const { situationMigrated } = migrateSituation({
    //     situation: simulationUnformatted.situation,
    //     migrationInstructions,
    //   })

    //   simulation.situation = situationMigrated

    //   simulation.computedResults = computeResults(situationMigrated)

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

recomputeEmptySimulationResults()
