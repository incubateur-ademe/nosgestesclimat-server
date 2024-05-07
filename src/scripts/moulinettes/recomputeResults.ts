import mongoose from 'mongoose'
import { Simulation } from '../../schemas/SimulationSchema'
import { config } from '../../config'
import { computeResults } from '../../helpers/simulation/computeResults'

async function recomputeResults() {
  mongoose.connect(config.mongo.url)
  try {
    const simulations = await Simulation.find()
    console.log('Simulations to recompute', simulations.length)

    let simulation
    for (simulation of simulations) {
      simulation.computedResults = computeResults(simulation.situation)

      await simulation.save()
    }

    console.log('Simulations updated')
  } catch (error) {
    console.error('Error updating simulations', error)
  }
}

recomputeResults()
