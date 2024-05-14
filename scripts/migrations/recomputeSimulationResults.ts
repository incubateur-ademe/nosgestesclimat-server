import mongoose from 'mongoose'
import { Simulation, SimulationType } from '../../src/schemas/SimulationSchema'
import { config } from '../../src/config'
import { computeResults } from '../../src/helpers/simulation/computeResults'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import Engine from 'publicodes'
import { handleSituationMigration } from '../../src/helpers/situation/handleSituationMigration'
import { unformatSituation } from '../../src/utils/unformatSituation'

async function recomputeResults() {
  console.log('Connecting to mongo')

  mongoose.connect(config.mongo.url)

  try {
    const numberOfSimulations = await Simulation.countDocuments()

    for (let cursor = 0; cursor < numberOfSimulations; cursor += 1000) {
      const simulations: SimulationType[] = await Simulation.find()
        .skip(0)
        .limit(1000)
        .exec()

      console.log('Simulations to recompute', simulations.length)

      let engine = new Engine(rules as unknown as NGCRules, {
        logger: {
          log: console.log,
          warn: () => null,
          error: console.error,
        },
      })

      for (const simulation of simulations) {
        const situationMigrated = handleSituationMigration({
          simulation: {
            ...simulation,
            situation: unformatSituation(simulation.situation),
          },
        })
        console.log(computeResults(situationMigrated.situation, engine))
        // await new Promise((resolve) => setTimeout(resolve, 1000))

        // simulation.computedResults = computeResults(
        //   simulation.situation,
        //   engine
        // )

        // await simulation.save()
      }

      console.log(`Simulations from ${cursor} to ${cursor + 1000} updated`)
    }
  } catch (error) {
    console.error('Error updating simulations', error)
  }
}

recomputeResults()
