import type { DottedName, NGCRuleNode } from '@incubateur-ademe/nosgestesclimat'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import type Engine from 'publicodes'
import type {
  EvaluatedNode,
  ParsedRules,
  PublicodesExpression,
} from 'publicodes'
import { utils } from 'publicodes'
import { carbonMetric, waterMetric } from '../../../src/constants/ngc'
import { engine } from '../../../src/constants/publicode'
import type { Metric, Situation } from '../../../src/types/types'

function safeEvaluate({
  engine,
  expr,
  metric = carbonMetric,
}: {
  engine: Engine
  expr: PublicodesExpression
  metric: Metric
}) {
  const exprWithContext = {
    valeur: expr,
    contexte: {
      métrique: `'${metric}'`,
    },
  }

  let evaluation: EvaluatedNode

  try {
    evaluation = engine.evaluate(exprWithContext)
  } catch (e) {
    console.error(e)
    return null
  }

  return evaluation
}

function getSubcategories({
  dottedName,
  getRule,
  parsedRules,
}: {
  dottedName: DottedName
  getRule: (dottedName: DottedName) => NGCRuleNode | null
  parsedRules: Record<string, NGCRuleNode>
}): DottedName[] {
  const ruleNode = getRule(dottedName)

  if (!ruleNode || !ruleNode.rawNode) {
    return []
  }

  const dottedNameSomme = ruleNode.rawNode.somme

  const dottedNameFormula = ruleNode.rawNode.formule

  // TO FIX: Sometimes the `somme` isn't in the formula.
  if (
    !dottedNameSomme && // No `somme` directly in the rule
    (!dottedNameFormula ||
      typeof dottedNameFormula === 'string' ||
      !Array.isArray(dottedNameFormula.somme)) // No `somme` in the formula or invalid format
  ) {
    return []
  }

  // TODO: Remove this check when the `somme` is always in the formula
  const sommeArray = (
    Array.isArray(dottedNameSomme)
      ? dottedNameSomme
      : typeof dottedNameFormula === 'object' &&
          Array.isArray(dottedNameFormula.somme)
        ? dottedNameFormula.somme
        : []
  ) as DottedName[]

  return (
    sommeArray.map(
      (potentialPartialRuleName: DottedName) =>
        utils.disambiguateReference(
          parsedRules,
          dottedName,
          potentialPartialRuleName
        ) as DottedName
    ) || []
  )
}

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

const safeGetSituation = ({
  situation,
  everyRules,
}: {
  situation: Situation
  everyRules: Set<DottedName>
}): Situation => {
  const unsupportedDottedNamesFromSituation = (
    Object.keys(situation) as DottedName[]
  ).filter((ruleName) => {
    // We check if the dotteName is a rule of the model
    if (!everyRules.has(ruleName)) {
      return true
    }

    // Value should never be an empty string
    if (situation[ruleName] === '') {
      return true
    }

    // We check if the value from a mutliple choices question `dottedName`
    // is defined as a rule `dottedName . value` in the model.
    // If not, the value in the situation is an old option, that is not an option anymore.
    if (
      typeof situation[ruleName] === 'string' &&
      situation[ruleName] !== 'oui' &&
      situation[ruleName] !== 'non' &&
      !everyRules.has(
        `${ruleName} . ${(situation[ruleName] as string)?.replaceAll(
          /^'|'$/g,
          ''
        )}` as DottedName
      )
    ) {
      return false
    }
    return false
  })

  const filteredSituation = { ...situation }

  unsupportedDottedNamesFromSituation.map((ruleName) => {
    // If a dottedName is not supported in the model, it is dropped from the situation.
    delete filteredSituation[ruleName]
  })

  return filteredSituation
}

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
      bilan: 0,
      categories: {
        transport: 0,
        alimentation: 0,
        logement: 0,
        divers: 0,
        'services sociétaux': 0,
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
        bilan: 0,
        categories: {
          transport: 0,
          alimentation: 0,
          logement: 0,
          divers: 0,
          'services sociétaux': 0,
        },
        subcategories: {},
      },
      eau: {
        bilan: 0,
        categories: {
          transport: 0,
          alimentation: 0,
          logement: 0,
          divers: 0,
          'services sociétaux': 0,
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
