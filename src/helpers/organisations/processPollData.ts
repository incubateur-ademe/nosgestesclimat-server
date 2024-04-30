import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import importedRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { DottedName, NGCRules } from '@incubateur-ademe/nosgestesclimat'
import { processCondition } from './processPollData/processCondition'
import { processFunFactsValues } from './processPollData/processFunFactsValues'

// This is shit but a hack from our lead dev
const rules = importedRules as unknown as NGCRules

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

export type FunFacts = {
  percentageOfBicycleUsers: number
  percentageOfVegetarians: number
  percentageOfCarOwners: number
  percentageOfPlaneUsers: number
  percentageOfLongPlaneUsers: number
  averageOfCarKilometers: number
  averageOfTravelers: number
  percentageOfElectricHeating: number
  percentageOfGasHeating: number
  percentageOfFuelHeating: number
  percentageOfWoodHeating: number
  averageOfElectricityConsumption: number
  percentageOfCoolingSystem: number
  percentageOfVegan: number
  percentageOfRedMeat: number
  percentageOfLocalAndSeasonal: number
  percentageOfBottledWater: number
  percentageOfZeroWaste: number
  amountOfClothing: number
  percentageOfStreaming: number
}

const funFactsRules: { [k in keyof FunFacts]: DottedName } = {
  percentageOfBicycleUsers: 'ui . organisations . roule en vélo',
  percentageOfVegetarians: 'ui . organisations . est végétarien',
  percentageOfCarOwners: 'ui . organisations . roule en voiture',
  percentageOfPlaneUsers: "ui . organisations . prend l'avion",
  percentageOfLongPlaneUsers:
    "ui . organisations . prend l'avion long courrier",
  averageOfCarKilometers: 'ui . organisations . km',
  averageOfTravelers: 'ui . organisations . voyageurs',
  percentageOfElectricHeating: 'ui . organisations . chauffage électricité',
  percentageOfGasHeating: 'ui . organisations . chauffage gaz',
  percentageOfFuelHeating: 'ui . organisations . chauffage fioul',
  percentageOfWoodHeating: 'ui . organisations . chauffage bois',
  averageOfElectricityConsumption:
    'ui . organisations . consommation électricité',
  percentageOfCoolingSystem: 'ui . organisations . possède climatisation',
  percentageOfVegan: 'ui . organisations . est végétalien',
  percentageOfRedMeat: 'ui . organisations . fréquence viande rouge',
  percentageOfLocalAndSeasonal: 'ui . organisations . local et de saison',
  percentageOfBottledWater: 'ui . organisations . eau en bouteille',
  percentageOfZeroWaste: 'ui . organisations . zéro déchet',
  amountOfClothing: 'ui . organisations . textile',
  percentageOfStreaming: 'ui . organisations . internet',
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

      let conditionResult = processCondition({
        situation: simulation.situation,
        rule: rules[dottedName],
      })

      if (typeof conditionResult === 'boolean' && conditionResult === true) {
        computedFunFacts[key as keyof FunFacts] += 1
      }

      if (typeof conditionResult === 'number') {
        computedFunFacts[key as keyof FunFacts] += conditionResult
      }
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
    funFacts: processFunFactsValues({
      simulations,
      computedFunFacts,
      funFactsRules,
      rules,
    }),
    simulationRecaps,
  }
}
