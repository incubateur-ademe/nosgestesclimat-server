import mongoose from 'mongoose'
import { Simulation } from '../../schemas/SimulationSchema'
import { config } from '../../config'
import { computeResults } from '../../helpers/simulation/computeResults'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import Engine from 'publicodes'

async function recomputeResults() {
  mongoose.connect(config.mongo.url)
  try {
    const simulations = await Simulation.find({
      modifiedAt: { $lt: new Date('2024-03-29') },
    })
    console.log('Simulations to recompute', simulations.length)

    let engine = new Engine(rules as unknown as NGCRules)

    let simulation
    for (simulation of simulations) {
      simulation.computedResults = computeResults(simulation.situation, engine)

      await simulation.save()
    }

    console.log('Simulations updated')
  } catch (error) {
    console.error('Error updating simulations', error)
  }
}

recomputeResults()
