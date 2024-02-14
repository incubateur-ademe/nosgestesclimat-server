import Engine from 'publicodes'
import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'

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
  funFacts: {
    percentageOfBicycleUsers: number
    percentageOfVegetarians: number
    percentageOfCarOwners: number
  }
  simulationRecaps: SimulationRecap[]
}

type Situation = {
  [key: string]: string | number
}

function getIsBicycleUser({ situation }: { situation: Situation }) {
  return (
    situation['transport . mobilité douce . vélo . présent'] === 'oui' ||
    situation['transport . mobilité douce . vae . présent'] === 'oui'
  )
}

function getIsVegetarian({ situation }: { situation: Situation }) {
  return (
    situation['alimentation . plats . viande 1 . nombre'] === 0 &&
    situation['alimentation . plats . viande 2 . nombre'] === 0 &&
    situation['alimentation . plats . poisson 1 . nombre'] === 0 &&
    situation['alimentation . plats . poisson 2 . nombre'] === 0
  )
}

export function processPollData({
  simulations,
  userId,
}: {
  simulations: SimulationType[]
  userId: string
}): Result {
  if (!simulations.length) {
    return {
      funFacts: {
        percentageOfBicycleUsers: 0,
        percentageOfVegetarians: 0,
        percentageOfCarOwners: 0,
      },
      simulationRecaps: [],
    }
  }
  // Condition: "oui" to transport.mobilité_douce.vélo ou transport.mobilité_douce.vae
  let numberOfBicycleUsers = 0
  // Condition: has only vegeterian and vegan meals
  let numberOfVegetarians = 0
  // Condition: "oui" to transport.voiture.propriétaire
  let numberOfCarOwners = 0

  // Pour chaque simulation du sondage
  const simulationRecaps = simulations.map((simulation) => {
    // We get the value for each fun fact
    if (getIsBicycleUser({ situation: simulation.situation })) {
      numberOfBicycleUsers += 1
    }
    if (getIsVegetarian({ situation: simulation.situation })) {
      numberOfVegetarians += 1
    }
    if (
      simulation.situation['transport . voiture . utilisateur régulier'] ===
        '"oui"' &&
      simulation.situation['transport . voiture . km'] <= 0
    ) {
      numberOfCarOwners += 1
    }

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
    funFacts: {
      percentageOfBicycleUsers: numberOfBicycleUsers / simulations.length,
      percentageOfVegetarians: numberOfVegetarians / simulations.length,
      percentageOfCarOwners: numberOfCarOwners / simulations.length,
    },
    simulationRecaps,
  }
}
