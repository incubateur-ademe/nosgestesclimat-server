import { Situation } from '../../../../types/types'
import { formatDottedName } from '../../../../utils/formatDottedName'

export function processCondition({
  situation,
  rule,
}: {
  situation: Situation
  rule: any
}) {
  if (!situation) {
    return false
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

  if (split_condition.length === 1) {
    return situation[formatDottedName(split_condition[0])] === 'oui'
  }

  let operator = split_condition[1].replace(/\s/g, '')

  if (operator === '=') {
    return (
      parseFloat(situation[formatDottedName(split_condition[0])] as string) ===
      parseFloat(split_condition[2])
    )
  }
  if (operator === '>') {
    return (
      parseFloat(situation[formatDottedName(split_condition[0])] as string) >
      parseFloat(split_condition[2])
    )
  }
  if (operator === '<') {
    return (
      parseFloat(situation[formatDottedName(split_condition[0])] as string) <
      parseFloat(split_condition[2])
    )
  }
  return false
}
