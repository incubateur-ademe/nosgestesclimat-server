// @ts-nocheck
import Engine from 'publicodes'

type SimulationRecap = {
  bilan: number
  categories: {
    [key: string]: number
  }
}

type Result = {
  numberSimulations: number
  averageCarbonFootprint: number
  averageCarbonFootprintPerCategory: {
    [key: string]: number
  }
  funFacts: {
    percentageOfBicycleUsers: number
    percentageOfVegetarians: number
    percentageOfCarOwners: number
  }
  simulationsFormatted: SimulationRecap[]
}

const FUN_FACTS_RULES = {
  percentageOfBicycleUsers: '',
  percentageOfVegetarians: '',
  percentageOfCarOwners: '',
}

function getIsBicycleUser({ situation }) {
  return (
    situation['transport . mobilité douce . vélo . présent'] === 'oui' ||
    situation['transport . mobilité douce . vae . présent'] === 'oui'
  )
}

function getIsVegetarian({ situation }) {
  return (
    situation['alimentation . plats . viande 1 . nombre'] === 0 &&
    situation['alimentation . plats . viande 2 . nombre'] === 0 &&
    situation['alimentation . plats . poisson 1 . nombre'] === 0 &&
    situation['alimentation . plats . poisson 2 . nombre'] === 0
  )
}

export async function processPollData({ poll, rules }): Result {
  const { simulations } = poll

  const engine = new Engine(rules)

  let carbonFootprintPerCategory = {
    alimentation: 0,
    logement: 0,
    transport: 0,
    divers: 0,
    'services sociétaux': 0,
  }

  // Condition: "oui" to transport.mobilité_douce.vélo ou transport.mobilité_douce.vae
  let numberOfBicycleUsers = 0
  // Condition: has only vegeterian and vegan meals
  let numberOfVegetarians = 0
  // Condition: "oui" to transport.voiture.propriétaire
  let numberOfCarOwners = 0

  // Pour chaque simulation du sondage
  const simulationsRecap = simulations.map((simulation) => {
    // We update the engine with the simulation situation
    engine.setSituation(simulation.situation)

    // We get the value for each fun fact
    if (getIsBicycleUser({ situation: simulation.situation })) {
      numberOfBicycleUsers += 1
    }
    if (getIsVegetarian({ situation: simulation.situation })) {
      numberOfVegetarians += 1
    }
    if (
      simulation.situation['transport . voiture . utilisateur régulier'] ===
      '"oui"'
    ) {
      numberOfCarOwners += 1
    }

    return {
      bilan: engine.evaluate('bilan')?.nodeValue,
      categories: Object.keys(carbonFootprintPerCategory).reduce(
        (acc, category) => {
          acc[category] = engine.evaluate(category)?.nodeValue
          return acc
        },
        {}
      ),
      additionalQuestions: simulation.additionalQuestions,
    }
  })

  return {
    funFacts: {
      percentageOfBicycleUsers: numberOfBicycleUsers / simulations.length,
      percentageOfVegetarians: numberOfVegetarians / simulations.length,
      percentageOfCarOwners: numberOfCarOwners / simulations.length,
    },
    simulationsRecap,
  }
}
