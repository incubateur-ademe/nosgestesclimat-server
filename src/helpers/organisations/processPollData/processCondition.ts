import { Situation } from '../../../types/types'
import { formatDottedName } from '../../../utils/formatDottedName'
import { DottedName, NGCRule } from '@incubateur-ademe/nosgestesclimat'

export function processCondition({
  situation,
  rule,
}: {
  situation: Situation
  rule: NGCRule
}): Boolean | number | string {
  if (!situation) {
    return false
  }

  if (rule?.formule?.moyenne) {
    return situation[formatDottedName(rule.formule.moyenne[0])] ?? 0
  }

  if (rule?.formule?.somme) {
    return rule.formule.somme.reduce((acc: number, dottedName: DottedName) => {
      let itemValue = parseFloat(
        situation[formatDottedName(dottedName)] as string
      )
      return acc + (!isNaN(itemValue) ? itemValue : 0)
    }, 0)
  }

  if (rule?.formule?.['une de ces conditions']) {
    return rule.formule['une de ces conditions'].some((condition: string) =>
      checkCondition(condition, situation)
    )
  }

  if (rule?.formule?.['toutes ces conditions']) {
    return rule.formule['toutes ces conditions'].every((condition: string) =>
      checkCondition(condition, situation)
    )
  }

  return false
}

function checkCondition(condition: string, situation: Situation): Boolean {
  let split_condition = condition.split(/(\s*[=<>]\s*)/).filter(Boolean)

  if (!split_condition) {
    return false
  }

  if (!Object.keys(situation).includes(formatDottedName(split_condition[0]))) {
    return false
  }

  if (split_condition.length === 1) {
    return situation[formatDottedName(split_condition[0])] === 'oui'
  }

  let operator = split_condition[1].replace(/\s/g, '')

  const answerType = isNaN(parseFloat(split_condition[2])) ? 'string' : 'number'

  let leftConditionValue: string | number = ''
  let rightConditionValue: string | number = ''

  if (answerType === 'string') {
    leftConditionValue = situation[formatDottedName(split_condition[0])]
    rightConditionValue = split_condition[2]
  }

  if (answerType === 'number') {
    leftConditionValue = parseFloat(
      situation[formatDottedName(split_condition[0])] as string
    )
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
  return false
}
