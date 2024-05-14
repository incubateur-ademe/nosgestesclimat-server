import { SimulationType } from '../../schemas/SimulationSchema'
import {
  unformatObjectKeysFromMongoDB,
  unformatStringArrayFromMongoDB,
} from '../../utils/format'

export function unformatSimulation(simulationToUnformat: SimulationType) {
  const unformattedSituation = unformatObjectKeysFromMongoDB({
    ...simulationToUnformat.situation,
  })
  const unformattedActionChoices = unformatObjectKeysFromMongoDB({
    ...simulationToUnformat.actionChoices,
  })
  const unformattedFoldedSteps = unformatStringArrayFromMongoDB([
    ...simulationToUnformat.foldedSteps,
  ])

  return {
    ...simulationToUnformat,
    situation: unformattedSituation,
    actionChoices: unformattedActionChoices,
    foldedSteps: unformattedFoldedSteps,
  }
}
