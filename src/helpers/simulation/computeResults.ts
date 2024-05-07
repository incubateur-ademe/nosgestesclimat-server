import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import Engine from 'publicodes'
import { SimulationType } from '../../schemas/SimulationSchema'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import { Situation } from '../../types/types'

export const safeGetSituation = ({
  situation,
  everyRules,
}: {
  situation: any
  everyRules: any[]
}): any => {
  const unsupportedDottedNamesFromSituation = Object.keys(situation).filter(
    (ruleName) => {
      // We check if the dotteName is a rule of the model
      if (!everyRules.includes(ruleName)) {
        const error = new Error(
          `error trying to use "${ruleName}" from the user situation: the rule doesn't exist in the model`
        )
        console.warn(error)
        return true
      }
      // We check if the value from a mutliple choices question `dottedName`
      // is defined as a rule `dottedName . value` in the model.
      // If not, the value in the situation is an old option, that is not an option anymore.
      if (
        typeof situation[ruleName] === 'string' &&
        situation[ruleName] !== 'oui' &&
        situation[ruleName] !== 'non' &&
        !everyRules.includes(
          `${ruleName} . ${(situation[ruleName] as string)?.replace(
            /^'|'$/g,
            ''
          )}`
        )
      ) {
        const error = new Error(
          `error trying to use "${ruleName}" answer from the user situation: "${situation[ruleName]}" doesn't exist in the model`
        )
        console.warn(error)
        return false
      }
      return false
    }
  )

  const filteredSituation = { ...situation }

  unsupportedDottedNamesFromSituation.map((ruleName: any) => {
    // If a dottedName is not supported in the model, it is dropped from the situation.
    delete filteredSituation[ruleName]
  })

  return filteredSituation
}

export function computeResults(situation: Situation) {
  const engine = new Engine(rules as unknown as NGCRules)

  const safeSituation = safeGetSituation({
    situation,
    everyRules: Object.keys(rules),
  })

  engine.setSituation(safeSituation)

  return {
    bilan: Number(engine.evaluate('bilan').nodeValue ?? 0),
    categories: {
      transport: Number(engine.evaluate('transport').nodeValue ?? 0),
      alimentation: Number(engine.evaluate('alimentation').nodeValue ?? 0),
      logement: Number(engine.evaluate('logement').nodeValue ?? 0),
      divers: Number(engine.evaluate('divers').nodeValue ?? 0),
      'services sociétaux': Number(
        engine.evaluate('services sociétaux').nodeValue ?? 0
      ),
    },
  }
}
