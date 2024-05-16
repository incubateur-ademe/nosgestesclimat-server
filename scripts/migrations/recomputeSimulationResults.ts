import mongoose, { HydratedDocument } from 'mongoose'
import { Simulation, SimulationType } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'
import { computeResults } from '../../src/helpers/simulation/computeResults'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import Engine from 'publicodes'
import { unformatSimulation } from '../../src/helpers/simulation/unformatSimulation'
//@ts-ignore
import { migrateSituation } from '@publicodes/tools/migration'
import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'

async function recomputeResults() {
  console.log('Connecting to mongo')

  mongoose.connect(config.mongo.url)

  try {
    const migrationInstructions = JSON.parse(
      JSON.stringify(migrationInstructionsJSON)
    )

    const numberOfSimulations = await Simulation.countDocuments()
    console.log('Simulations to recompute', numberOfSimulations)
    console.log('Starting to update simulations.')
    for (let cursor = 0; cursor < numberOfSimulations; cursor += 1000) {
      console.log('Next simulation batch update started.')

      const simulations: HydratedDocument<SimulationType>[] =
        await Simulation.find().skip(cursor).limit(1000).exec()

      let engine = new Engine(rules as unknown as NGCRules, {
        logger: {
          log: console.log,
          warn: () => null,
          error: console.error,
        },
      })

      for (const simulation of simulations) {
        const simulationUnformatted = unformatSimulation(simulation)

        const { situationMigrated } = migrateSituation({
          situation: simulationUnformatted.situation,
          migrationInstructions,
        })
        // console.log(computeResults(situationMigrated, engine))

        simulation.situation = situationMigrated

        simulation.computedResults = computeResults(situationMigrated, engine)

        await simulation.save()
      }

      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log(`Simulations from ${cursor} to ${cursor + 100} updated.`)
      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log('-----------------------------------')
      console.log('-----------------------------------')
    }
  } catch (error) {
    console.error('Error updating simulations', error)
  }
}

recomputeResults()
