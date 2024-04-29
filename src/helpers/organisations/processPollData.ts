import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { DottedName } from '@incubateur-ademe/nosgestesclimat'
import { processCondition } from './processPollData/processCondition'

type SimulationRecap = {
  bilan: number
  categories: {
    [key: string]: number
  }
  defaultAdditionalQuestionsAnswers: {
    postalCode?: string
    birthdate?: string
  }
  progression: number
}

type Result = {
  funFacts: FunFacts
  simulationRecaps: SimulationRecap[]
}

type FunFacts = {
  percentageOfBicycleUsers: number
  percentageOfVegetarians: number
  percentageOfCarOwners: number
  percentageOfPlaneUsers: number
}

const funFactsRules: { [k in keyof FunFacts]: DottedName } = {
  percentageOfBicycleUsers: 'ui . organisations . roule en vélo',
  percentageOfVegetarians: 'ui . organisations . est végétarien',
  percentageOfCarOwners: 'ui . organisations . roule en voiture',
  percentageOfPlaneUsers: "ui . organisations . prend l'avion",
}

export function processPollData({
  simulations,
  userId,
}: {
  simulations: SimulationType[]
  userId: string
}): Result {
  let computedFunFacts: FunFacts = {
    percentageOfBicycleUsers: 0,
    percentageOfVegetarians: 0,
    percentageOfCarOwners: 0,
    percentageOfPlaneUsers: 0,
  }

  if (!simulations.length) {
    return {
      funFacts: computedFunFacts,
      simulationRecaps: [],
    }
  }

  // Pour chaque simulation du sondage
  const simulationRecaps = simulations.map((simulation) => {
    Object.entries(funFactsRules).forEach(([key, dottedName]) => {
      if (!Object.keys(rules).includes(dottedName)) {
        throw new Error(`${dottedName} not found in rules`)
      }

      let conditionResult = processCondition({
        situation: simulation.situation,
        rule: rules[dottedName],
      })

      computedFunFacts[key as keyof FunFacts] += conditionResult
    })

    return {
      bilan: simulation.computedResults.bilan,
      categories: simulation.computedResults.categories,
      defaultAdditionalQuestionsAnswers:
        simulation.defaultAdditionalQuestionsAnswers ?? {},
      progression: simulation.progression,
      isCurrentUser:
        (simulation.user as unknown as UserType)?.userId === userId,
      date: simulation.modifiedAt,
    }
  })

  return {
    funFacts: getFunFactsPercentages(simulations.length, computedFunFacts),
    simulationRecaps,
  }
}

function getFunFactsPercentages(
  simulationsLength: number,
  computedFunFacts: FunFacts
): FunFacts {
  return Object.fromEntries(
    Object.entries(computedFunFacts).map(([key, value]) => {
      return [key, (value / simulationsLength) * 100]
    })
  ) as FunFacts
}
