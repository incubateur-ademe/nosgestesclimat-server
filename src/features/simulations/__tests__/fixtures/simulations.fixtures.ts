import { faker } from '@faker-js/faker'
import type { DottedName, NGCRuleNode } from '@incubateur-ademe/nosgestesclimat'
import personas from '@incubateur-ademe/nosgestesclimat/public/personas-fr.json'
import type { ParsedRules, PublicodesExpression } from 'publicodes'
import { utils } from 'publicodes'
import type supertest from 'supertest'
import { carbonMetric, waterMetric } from '../../../../constants/ngc'
import { engine } from '../../../../constants/publicode'
import type { Metric } from '../../../../types/types'
import type { SimulationCreateInputDto } from '../../simulations.validator'
import { SituationSchema } from '../../simulations.validator'

type TestAgent = ReturnType<typeof supertest>

export const CREATE_SIMULATION_ROUTE = '/simulations/v1'

export const FETCH_USER_SIMULATIONS_ROUTE = '/simulations/v1/:userId'

export const FETCH_USER_SIMULATION_ROUTE =
  '/simulations/v1/:userId/:simulationId'

const categories = [
  'transport',
  'alimentation',
  'logement',
  'divers',
  'services sociétaux',
] as const

const getSubcategories = ({
  dottedName,
  getRule,
  parsedRules,
}: {
  dottedName: DottedName
  getRule: (dottedName: DottedName) => NGCRuleNode | null
  parsedRules: Record<string, NGCRuleNode>
}): DottedName[] => {
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
  const sommeArray = Array.isArray(dottedNameSomme)
    ? dottedNameSomme
    : typeof dottedNameFormula === 'object' &&
        Array.isArray(dottedNameFormula.somme)
      ? dottedNameFormula.somme
      : []

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

const evaluate = ({
  expr,
  metric,
}: {
  expr: PublicodesExpression
  metric: Metric
}): number | undefined => {
  const value = engine.evaluate({
    valeur: expr,
    contexte: {
      métrique: `'${metric}'`,
    },
  }).nodeValue

  return typeof value === 'number' ? value : !!value ? +value : undefined
}

const computeMetricResults = (
  metric: Metric,
  parsedRules: ParsedRules<DottedName>
) => ({
  bilan: evaluate({ expr: 'bilan', metric }) ?? 0,
  categories: Object.fromEntries(
    categories.map((category) => [
      category,
      evaluate({ expr: category, metric }) ?? 0,
    ])
  ) as Record<(typeof categories)[number], number>,
  subcategories: Object.fromEntries(
    categories.flatMap((category) =>
      getSubcategories({
        dottedName: category,
        getRule: (dottedName) => engine.getRule(dottedName),
        parsedRules,
      }).map((subcategory) => [
        subcategory,
        evaluate({ expr: subcategory, metric }) ?? 0,
      ])
    )
  ),
})

const getComputedResults = (situation: SituationSchema) => {
  engine.setSituation(situation)

  const parsedRules = engine.getParsedRules()

  return {
    carbone: computeMetricResults(carbonMetric, parsedRules),
    eau: computeMetricResults(waterMetric, parsedRules),
  }
}

const getRandomPersona = () =>
  personas[
    faker.helpers.arrayElement(Object.keys(personas)) as keyof typeof personas
  ]

export const getRandomPersonaSituation = () => getRandomPersona().situation

export const getRandomTestCase = () => {
  const { nom, situation } = getRandomPersona()

  return {
    computedResults: getComputedResults(situation),
    situation,
    nom,
  }
}

export const createSimulation = async ({
  simulation: {
    id,
    date,
    user,
    situation,
    foldedSteps,
    progression,
    savedViaEmail,
    actionChoices,
    computedResults,
    additionalQuestionsAnswers,
  } = {},
  agent,
}: {
  agent: TestAgent
  simulation?: Partial<SimulationCreateInputDto>
}) => {
  situation = situation || getRandomPersonaSituation()
  computedResults =
    computedResults || getComputedResults(SituationSchema.parse(situation))

  const payload: SimulationCreateInputDto = {
    id: id || faker.string.uuid(),
    date,
    situation,
    foldedSteps,
    progression: progression || 1,
    savedViaEmail,
    actionChoices,
    computedResults,
    additionalQuestionsAnswers,
    user: {
      ...user,
      id: user?.id || faker.string.uuid(),
    },
  }

  const response = await agent.post(CREATE_SIMULATION_ROUTE).send(payload)

  return response.body
}
