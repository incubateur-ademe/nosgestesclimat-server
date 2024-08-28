import type { DottedName } from '@incubateur-ademe/nosgestesclimat'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { engine } from '../../constants/publicode'
import type { Situation } from '../../types/types'
import { safeGetSituation } from '../situation/safeGetSituation'

const everyRules = new Set<DottedName>(Object.keys(rules) as DottedName[])

export function computeResults(situation: Situation) {
  // We use the safeGetSituation function to remove unsupported dottedNames from the situation

  const safeSituation = safeGetSituation({
    situation,
    everyRules,
  })

  try {
    engine.setSituation(safeSituation)
  } catch (e) {
    console.error(e)
    return {
      bilan: undefined,
      categories: {
        transport: undefined,
        alimentation: undefined,
        logement: undefined,
        divers: undefined,
        'services sociétaux': undefined,
      },
    }
  }

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
