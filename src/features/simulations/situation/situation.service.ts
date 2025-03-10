import type { DottedName, NGCRule } from '@incubateur-ademe/nosgestesclimat'
import type Engine from 'publicodes'
import logger from '../../../logger'
import type { SituationSchema } from '../simulations.validator'

export type Rules = Record<DottedName, NGCRule | string | null>

const isDottedName = (dottedName: unknown): dottedName is DottedName =>
  typeof dottedName === 'string'

const safeEvaluateSituationDottedNameDefaultValue = ({
  dottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  dottedName: DottedName
  rules: Rules
}): number => {
  const rule = rules[dottedName]

  if (!rule || typeof rule !== 'object') {
    return 0
  }

  if (
    'applicable si' in rule &&
    !checkIfConditionIsTrue({
      conditionDottedName: [
        ...dottedName.split(' . ').slice(0, -1),
        rule['applicable si'],
      ].join(' . '),
      situation,
      rules,
    })
  ) {
    return 0
  }

  if ('par défaut' in rule && typeof rule['par défaut'] === 'number') {
    return rule['par défaut']
  }

  return 0
}

const safeEvaluateSituationDottedName = ({
  dottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  dottedName: unknown
  rules: Rules
}): number => {
  if (!isDottedName(dottedName)) {
    return 0
  }

  const rawValue = situation[dottedName]

  return typeof rawValue === 'object'
    ? safeEvaluateSituationDottedNameDefaultValue({
        dottedName,
        situation,
        rules,
      })
    : Number.isNaN(+rawValue)
      ? safeEvaluateSituationDottedNameDefaultValue({
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
  rules: Rules
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
      : safeEvaluateSituationDottedName({
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

export const getSituationDottedNameValue = ({
  dottedName,
  situation,
  rules,
}: {
  situation: SituationSchema
  dottedName: DottedName
  rules: Rules
}): number => {
  try {
    const rule = rules[dottedName]

    if (
      !rule ||
      typeof rule === 'string' ||
      !rule.formule ||
      typeof rule.formule !== 'object'
    ) {
      return 0
    }

    const { formule } = rule

    if ('moyenne' in formule && Array.isArray(formule.moyenne)) {
      const [moyenneDottedName] = formule.moyenne
      return safeEvaluateSituationDottedName({
        situation,
        dottedName: moyenneDottedName,
        rules,
      })
    }

    if ('somme' in formule && Array.isArray(formule.somme)) {
      return formule.somme.reduce(
        (acc, sommeDottedName) =>
          acc +
          safeEvaluateSituationDottedName({
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
