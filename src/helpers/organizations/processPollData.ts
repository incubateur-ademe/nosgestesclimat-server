import Engine from 'publicodes'
import { User, UserType } from '../../schemas/UserSchema'
import { Simulation } from '../../schemas/SimulationSchema'

type SimulationRecap = {
  bilan: number
  categories: {
    [key: string]: number
  }
  defaultAdditionalQuestions: Record<string, number | string>
  progression: number
}

type Result = {
  funFacts: {
    percentageOfBicycleUsers: number
    percentageOfVegetarians: number
    percentageOfCarOwners: number
  }
  simulationsRecap: SimulationRecap[]
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

export async function processPollData({
  simulations,
  rules,
  userId,
}: {
  simulations: Simulation[]
  rules: any
  userId: string
}): Promise<Result> {
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
        '"oui"' &&
      simulation.situation['transport . voiture . km'] <= 0
    ) {
      numberOfCarOwners += 1
    }

    return {
      bilan: engine.evaluate('bilan')?.nodeValue as number,
      categories: Object.keys(carbonFootprintPerCategory).reduce(
        (acc, category) => {
          const accModified = { ...acc }

          accModified[category] =
            (engine.evaluate(category)?.nodeValue as number) || 0

          return accModified
        },
        {} as {
          [key: string]: number
        }
      ),
      defaultAdditionalQuestions: simulation.defaultAdditionalQuestions ?? {},
      progression: simulation.progression,
      isCurrentUser:
        (simulation.user as unknown as UserType)?.userId === userId,
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
