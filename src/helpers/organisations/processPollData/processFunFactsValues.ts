import type {
  DottedName,
  FunFacts,
  NGCRules,
} from '@incubateur-ademe/nosgestesclimat'
import type { SimulationType } from '../../../schemas/SimulationSchema'

export function processFunFactsValues({
  simulations,
  computedFunFacts,
  funFactsRules,
  rules,
}: {
  simulations: SimulationType[]
  computedFunFacts: FunFacts
  funFactsRules: { [k in keyof FunFacts]: DottedName }
  rules: NGCRules
}): FunFacts {
  return Object.fromEntries(
    Object.entries(computedFunFacts).map(([key, value]) => {
      // This is so dirty
      if (
        key === 'averageOfCarKilometers' ||
        key === 'averageOfTravelers' ||
        key === 'averageOfElectricityConsumption'
      ) {
        const totalAnswers = simulations.reduce((acc, simulation) => {
          const formule = rules[funFactsRules[key]].formule
          if (typeof formule !== 'object' || !Array.isArray(formule.moyenne)) {
            return acc
          }

          return acc + (simulation.situation[formule.moyenne[0]] ? 1 : 0)
        }, 0)
        return [key, value / totalAnswers]
      }

      if (key.includes('percentage')) {
        return [key, (value / simulations.length) * 100]
      }

      return [key, value]
    })
  ) as FunFacts
}
