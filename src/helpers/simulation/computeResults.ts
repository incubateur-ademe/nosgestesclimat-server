import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import Engine from 'publicodes'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'
import { Situation } from '../../types/types'
import { safeGetSituation } from '../situation/safeGetSituation'

export function computeResults(situation: Situation, initiatedEngine?: Engine) {
  const engine = initiatedEngine || new Engine(rules as unknown as NGCRules)

  // We use the safeGetSituation function to remove unsupported dottedNames from the situation
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
