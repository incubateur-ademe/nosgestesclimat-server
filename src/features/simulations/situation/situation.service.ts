import type { DottedName, NGCRules } from '@incubateur-ademe/nosgestesclimat'
import type Engine from 'publicodes'
import logger from '../../../logger.js'
import type { SituationSchema } from '../simulations.validator.js'

const isDottedName = (dottedName: unknown): dottedName is DottedName =>
  typeof dottedName === 'string'

const mergeDottedName = (root: DottedName, suffix: string) => {
  const set = new Set(root.split(' . ').slice(0, -1))
  suffix.split(' . ').forEach((s) => set.add(s))
  return Array.from(set).join(' . ') as DottedName
}

const evaluateSituationDottedNameDefaultValue = ({
  dottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  dottedName: DottedName
  rules: Partial<NGCRules>
}): number => {
  const rule = rules[dottedName]

  if (!rule || typeof rule !== 'object') {
    return 0
  }

  if (
    'applicable si' in rule &&
    typeof rule['applicable si'] === 'string' &&
    !checkIfConditionIsTrue({
      conditionDottedName: mergeDottedName(dottedName, rule['applicable si']),
      situation,
      rules,
    })
  ) {
    return 0
  }

  if ('par défaut' in rule) {
    const defaultValue = rule['par défaut']
    if (typeof defaultValue === 'number') {
      return defaultValue
    }

    if (typeof defaultValue === 'string') {
      return getSituationDottedNameValue({
        dottedName: mergeDottedName(dottedName, defaultValue),
        situation,
        rules,
      })
    }
  }

  return 0
}

const evaluateSituationDottedName = ({
  dottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  dottedName: unknown
  rules: Partial<NGCRules>
}): number => {
  if (!isDottedName(dottedName)) {
    return 0
  }

  const rawValue = situation[dottedName]

  return typeof rawValue === 'object'
    ? evaluateSituationDottedNameDefaultValue({
        dottedName,
        situation,
        rules,
      })
    : Number.isNaN(+rawValue)
      ? evaluateSituationDottedNameDefaultValue({
          dottedName,
          situation,
          rules,
        })
      : +rawValue
}

type Operator = '<' | '>' | '='

const OPERATORS = new Set(['>', '<', '='])

const isOperator = (raw: string): raw is Operator => OPERATORS.has(raw)

const evaluateConditions = (
  operator: Operator,
  {
    left,
    right,
  }: { left: number; right: number } | { left: string; right: string }
) => {
  switch (operator) {
    case '<':
      return left < right
    case '>':
      return left > right
    case '=':
      return left === right
  }
}

const checkIfConditionIsTrue = ({
  conditionDottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  conditionDottedName: unknown
  rules: Partial<NGCRules>
}): boolean => {
  if (!isDottedName(conditionDottedName)) {
    return false
  }

  const [dottedName, operator, value] = conditionDottedName
    .split(/(\s*[=<>]\s*)/)
    .map((s) => s.trim())

  if (!dottedName) {
    return false
  }

  if (!operator && !value) {
    return situation[dottedName] === 'oui'
  }

  const left =
    typeof situation[dottedName] === 'string'
      ? situation[dottedName]
      : evaluateSituationDottedName({
          dottedName,
          situation,
          rules,
        })
  if (isOperator(operator) && value) {
    if (Number.isNaN(+value)) {
      return typeof left === 'string'
        ? evaluateConditions(operator, { left, right: value })
        : false
    }
    return typeof left === 'number'
      ? evaluateConditions(operator, { left, right: +value })
      : false
  }

  return false
}

const evaluateSituationFormula = ({
  situation,
  formule,
  rules,
}: {
  situation: SituationSchema
  formule: Record<string, unknown>
  rules: Partial<NGCRules>
}): number => {
  if ('variations' in formule && Array.isArray(formule.variations)) {
    const variations = [...formule.variations]
    const fallback = variations.pop()

    for (const variation of variations) {
      if (
        checkIfConditionIsTrue({
          conditionDottedName: variation.si,
          situation,
          rules,
        })
      ) {
        if (typeof variation.alors === 'object') {
          return evaluateSituationFormula({
            formule: variation.alors,
            situation,
            rules,
          })
        }

        return +variation.alors || 0
      }
    }

    formule = fallback.sinon

    if (typeof formule === 'number') {
      // TODO: fix me engine does not fallback correctly
      // return formule
      return 0
    }
  }

  if ('moyenne' in formule && Array.isArray(formule.moyenne)) {
    const [moyenneDottedName] = formule.moyenne
    return evaluateSituationDottedName({
      situation,
      dottedName: moyenneDottedName,
      rules,
    })
  }

  if ('somme' in formule && Array.isArray(formule.somme)) {
    return formule.somme.reduce(
      (acc, sommeDottedName) =>
        acc +
        evaluateSituationDottedName({
          situation,
          dottedName: sommeDottedName,
          rules,
        }),
      0
    )
  }

  if (
    'une de ces conditions' in formule &&
    Array.isArray(formule['une de ces conditions'])
  ) {
    return formule['une de ces conditions'].some((conditionDottedName) =>
      checkIfConditionIsTrue({
        conditionDottedName,
        situation,
        rules,
      })
    )
      ? 1
      : 0
  }

  if (
    'toutes ces conditions' in formule &&
    Array.isArray(formule['toutes ces conditions'])
  ) {
    return formule['toutes ces conditions'].every((conditionDottedName) =>
      checkIfConditionIsTrue({
        conditionDottedName,
        situation,
        rules,
      })
    )
      ? 1
      : 0
  }

  return 0
}

export const getSituationDottedNameValue = ({
  dottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  dottedName: DottedName
  rules: Partial<NGCRules>
}): number => {
  try {
    const rule = rules[dottedName]

    if (
      !rule ||
      typeof rule === 'string' ||
      !rule.formule ||
      typeof rule.formule !== 'object'
    ) {
      if (typeof rule?.formule === 'number') {
        return rule.formule
      }
      return 0
    }

    return evaluateSituationFormula({
      formule: rule.formule,
      situation,
      rules,
    })
  } catch (error) {
    logger.error(`Cannot evaluate dottedName ${dottedName}`, {
      situation,
      error,
    })

    return 0
  }
}

export const getSituationDottedNameValueWithEngine = ({
  dottedName,
  situation,
  engine,
}: {
  situation: SituationSchema
  dottedName: DottedName
  engine: Engine
}) => {
  try {
    engine.setSituation(situation)

    const value = engine.evaluate(dottedName).nodeValue

    if (typeof value === 'number' && !!value) {
      return value
    }

    if (value === true) {
      return 1
    }

    return 0
  } catch (error) {
    logger.error(`Cannot evaluate dottedName ${dottedName}`, {
      situation,
      error,
    })

    return 0
  }
}
