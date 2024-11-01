import type { DottedName, NGCRule } from '@incubateur-ademe/nosgestesclimat'
import type { Situation } from '../../../types/types'

export function processCondition({
  situation,
  rule,
}: {
  situation: Situation
  rule: NGCRule
}): boolean | number | string {
  if (!situation) {
    return false
  }

  if (typeof rule?.formule !== 'object') {
    return false
  }

  // if `moyenne` attibute is used in ui rule, we want to return the value of the dottedName. Average is computed elsewhere
  if (Array.isArray(rule?.formule?.moyenne)) {
    return (situation[rule.formule.moyenne[0]] ?? 0) as string | number
  }

  // if `somme` attibute is used in ui rule, we want to return the sum of values of dottedNames
  if (Array.isArray(rule?.formule?.somme)) {
    return rule.formule.somme.reduce((acc: number, dottedName: DottedName) => {
      const itemValue = parseFloat(situation[dottedName] as string)
      return acc + (!isNaN(itemValue) ? itemValue : 0)
    }, 0)
  }

  // if `une de ces conditions` attibute is used in ui rule, we want to return true if one of the conditions is true. The condition is dealt with in checkCondition.
  if (Array.isArray(rule?.formule?.['une de ces conditions'])) {
    return rule.formule['une de ces conditions'].some((condition: string) =>
      checkCondition(condition, situation)
    )
  }

  // if `une de ces conditions` attibute is used in ui rule, we want to return true if all conditions are true. The condition is dealt with in checkCondition.
  if (Array.isArray(rule?.formule?.['toutes ces conditions'])) {
    return rule.formule['toutes ces conditions'].every((condition: string) =>
      checkCondition(condition, situation)
    )
  }

  // We want to return "false" in any other case
  return false
}

function checkCondition(condition: string, situation: Situation): boolean {
  // The condition well defined can be split in 3 parts: the dottedName, the operator (=, <, >) and the value. We split the condition in an array.
  const split_condition = condition.split(/(\s*[=<>]\s*)/).filter(Boolean)

  if (!split_condition) {
    return false
  }

  if (!Object.keys(situation).includes(split_condition[0])) {
    return false
  }

  // If the condition is only a dottedName, the check of the boolean value is implicit. We want to return true if the value of the dottedName is "oui" in the situation.
  if (split_condition.length === 1) {
    return situation[split_condition[0]] === 'oui'
  }

  // If the condition is a dottedName, an operator and a value, we want to check condition between the value in the situation and the value in the condition.
  if (split_condition.length === 3) {
    return (
      checkConditionWithOperator(
        split_condition as [string, string, string],
        situation
      ) ?? false
    )
  }
  return false
}

function checkConditionWithOperator(
  split_condition: [string, string, string],
  situation: Situation
) {
  const operator = split_condition[1].replace(/\s/g, '')

  const answerType = isNaN(parseFloat(split_condition[2])) ? 'string' : 'number'

  let leftConditionValue: string | number = ''
  let rightConditionValue: string | number = ''

  if (answerType === 'string') {
    leftConditionValue = situation[split_condition[0]] as string
    rightConditionValue = split_condition[2]
  }

  if (answerType === 'number') {
    leftConditionValue = parseFloat(situation[split_condition[0]] as string)
    rightConditionValue = parseFloat(split_condition[2])
  }
  if (operator === '=') {
    return leftConditionValue === rightConditionValue
  }
  if (operator === '>') {
    return leftConditionValue > rightConditionValue
  }
  if (operator === '<') {
    return leftConditionValue < rightConditionValue
  }
}
