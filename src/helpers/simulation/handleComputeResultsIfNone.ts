import mongoose, { HydratedDocument } from 'mongoose'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import Engine from 'publicodes'
import { SimulationType } from '../../schemas/SimulationSchema'
import { config } from '../../config'
import { unformatSimulation } from './unformatSimulation'
import { computeResults } from './computeResults'

export function handleComputeResultsIfNone(
  simulation: HydratedDocument<SimulationType>,
  engine?: Engine
): HydratedDocument<SimulationType> {
  try {
    // Unformat simulation, just in case
    // TODO: remove unformatting when possible
    const simulationUnformatted = unformatSimulation(simulation)

    simulation.situation = simulationUnformatted.situation

    // If the simulation has already been computed, we return it
    // TEMPORARY: we check if the bilan is not 8.9. If it is it might be a false computed result and we need to recalculate it
    if (
      simulation.computedResults &&
      Math.floor(simulation.computedResults.bilan / 100) !== 88
    ) {
      return simulation
    }

    if (!engine) {
      return simulation
    }

    simulation.computedResults = computeResults(simulation.situation, engine)

    return simulation
  } catch (error) {
    console.error('Error updating simulations', error)
    return simulation
  }
}
