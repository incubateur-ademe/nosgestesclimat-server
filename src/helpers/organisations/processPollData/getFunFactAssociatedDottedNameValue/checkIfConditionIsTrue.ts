import { Situation } from '../../../../types/types'

function checkIfConditionWithOperatorIsTrue(
  [dottedName, operator, value]: [string, string, string],
  situation: Situation
) {
  const answerType = isNaN(parseFloat(value)) ? 'string' : 'number'

  let leftConditionValue: string | number = ''
  let rightConditionValue: string | number = ''

  if (answerType === 'string') {
    leftConditionValue = situation[dottedName] as string
    rightConditionValue = value
  }

  if (answerType === 'number') {
    leftConditionValue = parseFloat(situation[dottedName] as string)
    rightConditionValue = parseFloat(value)
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

export function checkIfConditionIsTrue(
  condition: string,
  situation: Situation
): Boolean {
  // The condition we'll define can be split in 3 parts: the dottedName,
  // the operator (=, <, >) and the value. We split the condition in an array.
  const splitedCondition = condition.split(/(\s*[=<>]\s*)/).filter(Boolean)

  if (
    !splitedCondition ||
    !Object.keys(situation).includes(splitedCondition[0])
  ) {
    return false
  }

  const [dottedName, operator, value] = splitedCondition
  const operatorFormatted = operator?.replace(/\s/g, '')

  // If the condition is only a dottedName, the check of the boolean value is implicit.
  // We want to return true if the value of the dottedName is "oui" in the situation.
  // ex: transport . mobilité douce . vélo . présent
  if (dottedName && !operatorFormatted && !value) {
    return situation[splitedCondition[0]] === 'oui'
  }

  // If the condition is a dottedName, an operator and a value, we want to check
  // condition between the value in the situation and the value in the condition.
  if (dottedName && operatorFormatted && value) {
    return (
      checkIfConditionWithOperatorIsTrue(
        [dottedName, operatorFormatted, value],
        situation
      ) ?? false
    )
  }
  return false
}
