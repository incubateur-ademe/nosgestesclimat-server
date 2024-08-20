import type {
  DottedName,
  FunFacts,
  NGCRules,
} from '@incubateur-ademe/nosgestesclimat'
import importedRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import importedFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json'
import type { SimulationType } from '../../schemas/SimulationSchema'
import type { UserType } from '../../schemas/UserSchema'
import { getFunFactAssociatedDottedNameValue } from './processPollData/getFunFactAssociatedDottedNameValue'
import { processFunFactsValues } from './processPollData/processFunFactsValues'

const MAX_VALUE = 100000

// This is shit but a hack from our lead dev
const rules = importedRules as unknown as NGCRules

const funFactsRules = importedFunFacts as { [k in keyof FunFacts]: DottedName }

function isExcluded(simulation: SimulationType) {
  if (
    simulation.computedResults &&
    [
      simulation.computedResults?.bilan,
      ...Object.values(simulation.computedResults?.categories || {}),
    ].some((value) => (value as number) > MAX_VALUE)
  ) {
    return true
  }

  return false
}

type SimulationRecap = {
  bilan?: number
  categories?: {
    [key: string]: number
  }
  defaultAdditionalQuestionsAnswers: {
    postalCode?: string
    birthdate?: string
  }
  progression?: number
}

type Result = {
  funFacts: FunFacts
  simulationRecaps: SimulationRecap[]
}

export function processPollData({
  simulations,
  userId,
}: {
  simulations: SimulationType[]
  userId: string
}): Result {
  // We filter every simulation that are out of bounds
  const filteredSimulations = simulations.filter(
    (simulation) => !isExcluded(simulation)
  )

  // We agregate the fun facts of every simulation
  const computedFunFacts = Object.entries(funFactsRules).reduce(
    (acc: FunFacts, [key, dottedName]) => {
      if (!Object.keys(rules).includes(dottedName)) {
        return acc
      }

      const value = filteredSimulations.reduce((acc, simulation) => {
        const valueObtained = getFunFactAssociatedDottedNameValue({
          situation: simulation.situation,
          rule: rules[dottedName],
        })

        if (typeof valueObtained === 'boolean' && valueObtained === true) {
          return acc + 1
        }

        if (typeof valueObtained === 'number') {
          return acc + valueObtained
        }

        return acc
      }, 0)

      return {
        ...acc,
        [key]: value,
      }
    },
    {} as FunFacts
  )

  // We compute the fun facts (percentage and stuff like that)
  const funFacts = processFunFactsValues({
    simulations: filteredSimulations,
    computedFunFacts,
    funFactsRules,
    rules,
  })

  // We format the simulation recaps (and why the fuck is it not the simulations object directly?)
  const simulationRecaps = simulations.map((simulation) => ({
    ...simulation.computedResults,
    defaultAdditionalQuestionsAnswers: {
      ...(simulation.defaultAdditionalQuestionsAnswers ?? {}),
    },
    progression: simulation.progression,
    isCurrentUser: (simulation.user as unknown as UserType)?.userId === userId,
    date: simulation.date ? new Date(simulation.date) : undefined,
    customAdditionalQuestionsAnswers:
      simulation.customAdditionalQuestionsAnswers ?? [],
  }))

  return {
    funFacts,
    simulationRecaps,
  }
}
