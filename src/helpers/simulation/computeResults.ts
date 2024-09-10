import type { DottedName } from '@incubateur-ademe/nosgestesclimat'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import type { ParsedRules } from 'publicodes'
import { carbonMetric, waterMetric } from '../../constants/ngc'
import { engine } from '../../constants/publicode'
import type { Metric, Situation } from '../../types/types'
import { getSubcategories } from '../publicodes/getSubcategories'
import { safeEvaluate } from '../publicodes/safeEvaluate'
import { safeGetSituation } from '../situation/safeGetSituation'

const everyRules = new Set<DottedName>(Object.keys(rules) as DottedName[])

const categories = [
  'transport',
  'alimentation',
  'logement',
  'divers',
  'services sociétaux',
] as const

const computeMetricResults = (
  metric: Metric,
  parsedRules: ParsedRules<DottedName>
) => ({
  bilan: Number(
    safeEvaluate({ engine, expr: 'bilan', metric })?.nodeValue ?? 0
  ),
  categories: Object.fromEntries(
    categories.map((category) => [
      category,
      Number(safeEvaluate({ engine, expr: category, metric })?.nodeValue ?? 0),
    ])
  ),
  subcategories: Object.fromEntries(
    categories.flatMap((category) =>
      getSubcategories({
        dottedName: category,
        getRule: (dottedName) => engine.getRule(dottedName),
        parsedRules,
      }).map((subcategory) => [
        subcategory,
        Number(
          safeEvaluate({ engine, expr: subcategory, metric })?.nodeValue ?? 0
        ),
      ])
    )
  ),
})

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

export function fullComputeResults(situation: Situation) {
  const safeSituation = safeGetSituation({
    situation,
    everyRules,
  })

  try {
    engine.setSituation(safeSituation)
  } catch (e) {
    console.error(e)
    return {
      carbone: {
        bilan: undefined,
        categories: {
          transport: undefined,
          alimentation: undefined,
          logement: undefined,
          divers: undefined,
          'services sociétaux': undefined,
        },
        subcategories: {},
      },
      eau: {
        bilan: undefined,
        categories: {
          transport: undefined,
          alimentation: undefined,
          logement: undefined,
          divers: undefined,
          'services sociétaux': undefined,
        },
        subcategories: {},
      },
    }
  }

  const parsedRules = engine.getParsedRules()

  return {
    carbone: computeMetricResults(carbonMetric, parsedRules),
    eau: computeMetricResults(waterMetric, parsedRules),
  }
}
