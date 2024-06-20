import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import importedRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import importedFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json'
import {
  DottedName,
  NGCRules,
  FunFacts,
} from '@incubateur-ademe/nosgestesclimat'
import { processCondition } from './processPollData/processCondition'
import { processFunFactsValues } from './processPollData/processFunFactsValues'

const MAX_VALUE = 100000

// This is shit but a hack from our lead dev
const rules = importedRules as unknown as NGCRules

const funFactsRules = importedFunFacts as { [k in keyof FunFacts]: DottedName }

function isExcluded(simulation: SimulationType) {
  if (
    [
      simulation.computedResults.bilan,
      Object.values(simulation.computedResults.categories),
    ].some((value) => (value as number) > MAX_VALUE)
  ) {
    return true
  }

  return false
}

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

export function processPollData({
  simulations,
  userId,
}: {
  simulations: SimulationType[]
  userId: string
}): Result {
  // Is there a way to generate it dynamically ?
  let computedFunFacts: FunFacts = {
    percentageOfBicycleUsers: 0,
    percentageOfVegetarians: 0,
    percentageOfCarOwners: 0,
    percentageOfPlaneUsers: 0,
    percentageOfLongPlaneUsers: 0,
    averageOfCarKilometers: 0,
    averageOfTravelers: 0,
    percentageOfElectricHeating: 0,
    percentageOfGasHeating: 0,
    percentageOfFuelHeating: 0,
    percentageOfWoodHeating: 0,
    averageOfElectricityConsumption: 0,
    percentageOfCoolingSystem: 0,
    percentageOfVegan: 0,
    percentageOfRedMeat: 0,
    percentageOfLocalAndSeasonal: 0,
    percentageOfBottledWater: 0,
    percentageOfZeroWaste: 0,
    amountOfClothing: 0,
    percentageOfStreaming: 0,
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

      const conditionResult = processCondition({
        situation: simulation.situation,
        rule: rules[dottedName],
      })

      if (
        typeof conditionResult === 'boolean' &&
        conditionResult === true &&
        // Remove the simulation with extreme values to avoid corrupting the fun facts
        !isExcluded(simulation)
      ) {
        computedFunFacts[key as keyof FunFacts] += 1
      }

      // Remove the simulation with extreme values to avoid corrupting the fun facts
      if (typeof conditionResult === 'number' && !isExcluded(simulation)) {
        computedFunFacts[key as keyof FunFacts] += conditionResult
      }
    })
    return {
      bilan: simulation.computedResults.bilan,
      // TODO : handle this better, returning the situation allows us to
      // recalculate the computedResults on the client-side in case of bilan === 0
      situation:
        simulation.computedResults.bilan === 0
          ? simulation.situation
          : undefined,
      categories: { ...(simulation.computedResults.categories ?? {}) },
      defaultAdditionalQuestionsAnswers: {
        ...(simulation.defaultAdditionalQuestionsAnswers ?? {}),
      },
      progression: simulation.progression,
      isCurrentUser:
        (simulation.user as unknown as UserType)?.userId === userId,
      date: simulation.updatedAt ? new Date(simulation.updatedAt) : undefined,
      customAdditionalQuestionsAnswers:
        simulation.customAdditionalQuestionsAnswers ?? [],
    }
  })

  return {
    funFacts: processFunFactsValues({
      simulations: simulations.filter((simulation) => !isExcluded(simulation)),
      computedFunFacts,
      funFactsRules,
      rules,
    }),
    simulationRecaps,
  }
}
