import { SimulationType } from '../../schemas/SimulationSchema'
import { unformatSituation } from '../../utils/formatting/unformatSituation'

export function unformatSimulation(simulationToUnformat: SimulationType) {
  const unformattedSituation = unformatSituation({
    ...simulationToUnformat.situation,
  })

  return {
    ...simulationToUnformat,
    situation: unformattedSituation,
  }
}
