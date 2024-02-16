import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'

function formatDottedName(dottedName: string) {
  return dottedName.replaceAll(' . ', '_').replaceAll(' ', '-')
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
    situation[
      formatDottedName('transport . mobilité douce . vélo . présent')
    ] === 'oui' ||
    situation[
      formatDottedName('transport . mobilité douce . vae . présent')
    ] === 'oui'
  )
}

function getIsVegetarian({ situation }: { situation: Situation }) {
  return (
    situation[formatDottedName('alimentation . plats . viande 1 . nombre')] ===
      0 &&
    situation[formatDottedName('alimentation . plats . viande 2 . nombre')] ===
      0 &&
    situation[formatDottedName('alimentation . plats . poisson 1 . nombre')] ===
      0 &&
    situation[formatDottedName('alimentation . plats . poisson 2 . nombre')] ===
      0
  )
}

function getIsDriver({ situation }: { situation: Situation }) {
  return (situation[formatDottedName('transport . voiture . km')] as number) > 0
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
    if (getIsDriver({ situation: simulation.situation })) {
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
      percentageOfBicycleUsers:
        (numberOfBicycleUsers / simulations.length) * 100,
      percentageOfVegetarians: (numberOfVegetarians / simulations.length) * 100,
      percentageOfCarOwners: (numberOfCarOwners / simulations.length) * 100,
    },
    simulationRecaps,
  }
}
