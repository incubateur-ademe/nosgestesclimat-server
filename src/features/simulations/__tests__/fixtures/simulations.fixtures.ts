import { faker } from '@faker-js/faker'
import type { DottedName, NGCRuleNode } from '@incubateur-ademe/nosgestesclimat'
import personas from '@incubateur-ademe/nosgestesclimat/public/personas-fr.json'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import type { ParsedRules, PublicodesExpression } from 'publicodes'
import { utils } from 'publicodes'
import type supertest from 'supertest'
import { carbonMetric, waterMetric } from '../../../../constants/ngc'
import { engine } from '../../../../constants/publicode'
import type { Metric } from '../../../../types/types'
import type {
  SimulationCreateInputDto,
  SimulationParticipantCreateInputDto,
} from '../../simulations.validator'
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

export const getSimulationPayload = ({
  id,
  date,
  situation,
  foldedSteps,
  progression,
  savedViaEmail,
  actionChoices,
  computedResults,
  additionalQuestionsAnswers,
}: Partial<SimulationParticipantCreateInputDto> = {}): SimulationParticipantCreateInputDto => {
  situation = situation || getRandomPersonaSituation()
  computedResults =
    computedResults || getComputedResults(SituationSchema.parse(situation))

  return {
    id: id || faker.string.uuid(),
    date,
    situation,
    foldedSteps,
    progression: progression || 1,
    savedViaEmail,
    actionChoices,
    computedResults,
    additionalQuestionsAnswers,
  }
}

export const createSimulation = async ({
  agent,
  simulation = {},
}: {
  agent: TestAgent
  simulation?: Partial<SimulationCreateInputDto>
}) => {
  const { user } = simulation
  const payload: SimulationCreateInputDto = {
    ...getSimulationPayload(simulation),
    user: {
      ...user,
      id: user?.id || faker.string.uuid(),
    },
  }

  const scope = nock(process.env.BREVO_URL!)

  if (payload.user.email) {
    scope
      .post('/v3/contacts')
      .reply(200)
      .post('/v3/contacts/lists/22/contacts/remove')
      .reply(200)
      .post('/v3/contacts/lists/32/contacts/remove')
      .reply(200)
      .post('/v3/contacts/lists/35/contacts/remove')
      .reply(200)
      .post('/v3/contacts/lists/36/contacts/remove')
      .reply(200)

    if (payload.progression === 1) {
      scope.post('/v3/smtp/email').reply(200)
    }
  }

  const response = await agent
    .post(CREATE_SIMULATION_ROUTE)
    .send(payload)
    .expect(StatusCodes.CREATED)

  return response.body
}
