import type { DottedName, NGCRule } from '@incubateur-ademe/nosgestesclimat'
import logger from '../../../logger'
import type { SituationSchema } from '../simulations.validator'

export type Rules = Record<DottedName, NGCRule | string | null>

const safeEvaluateSituationDottedName = (
  situation: SituationSchema,
  dottedName: unknown
): number => {
  const value = typeof dottedName === 'string' ? situation[dottedName] : 0

  return typeof value === 'object' ? 0 : Number.isNaN(+value) ? 0 : +value
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

const checkIfConditionIsTrue = (
  condition: string,
  situation: SituationSchema
): boolean => {
  const [dottedName, operator, value] = condition
    .split(/(\s*[=<>]\s*)/)
    .map((s) => s.trim())

  if (!dottedName || !Object.keys(situation).includes(dottedName)) {
    return false
  }

  if (!operator && !value) {
    return situation[dottedName] === 'oui'
  }

  const left = situation[dottedName]
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
      return safeEvaluateSituationDottedName(situation, moyenneDottedName)
    }

    if ('somme' in formule && Array.isArray(formule.somme)) {
      return formule.somme.reduce(
        (acc, sommeDottedName) =>
          acc + safeEvaluateSituationDottedName(situation, sommeDottedName),
        0
      )
    }

    if (
      'une de ces conditions' in formule &&
      Array.isArray(formule['une de ces conditions'])
    ) {
      return formule['une de ces conditions'].some((cond) =>
        typeof cond === 'string'
          ? checkIfConditionIsTrue(cond, situation)
          : false
      )
        ? 1
        : 0
    }

    if (
      'toutes ces conditions' in formule &&
      Array.isArray(formule['toutes ces conditions'])
    ) {
      return formule['toutes ces conditions'].every((cond) =>
        typeof cond === 'string'
          ? checkIfConditionIsTrue(cond, situation)
          : false
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
