import type { DottedName, NGCRule } from '@incubateur-ademe/nosgestesclimat'
import type { Situation } from '../../../types/types'
import { checkIfConditionIsTrue } from './getFunFactAssociatedDottedNameValue/checkIfConditionIsTrue'

export function getFunFactAssociatedDottedNameValue({
  situation,
  rule,
}: {
  situation: Situation
  rule: NGCRule
}): boolean | number | string {
  // Shouldn't happen but you never know
  if (!situation) {
    return false
  }

  if (typeof rule?.formule !== 'object') {
    return false
  }

  // if `moyenne` attribute is used in ui rule, we want to return the value
  // of the dottedName. Average is computed elsewhere
  if (Array.isArray(rule?.formule?.moyenne)) {
    return (situation[rule.formule.moyenne[0]] ?? 0) as string | number
  }

  // if `somme` attribute is used in ui rule, we want to return the sum of values of dottedNames
  if (Array.isArray(rule?.formule?.somme)) {
    return rule.formule.somme.reduce((acc: number, dottedName: DottedName) => {
      const itemValue = parseFloat(situation[dottedName] as string)
      return acc + (!isNaN(itemValue) ? itemValue : 0)
    }, 0)
  }

  // if `une de ces conditions` attibute is used in ui rule, we want to return true
  // if one of the conditions is true. The condition is dealt with in checkIfConditionIsTrue.
  if (Array.isArray(rule?.formule?.['une de ces conditions'])) {
    return rule.formule['une de ces conditions'].some((condition: string) => {
      return checkIfConditionIsTrue(condition, situation)
    })
  }

  // if `une de ces conditions` attibute is used in ui rule, we want to return true
  // if all conditions are true. The condition is dealt with in checkIfConditionIsTrue.
  if (Array.isArray(rule?.formule?.['toutes ces conditions'])) {
    return rule.formule['toutes ces conditions'].every((condition: string) =>
      checkIfConditionIsTrue(condition, situation)
    )
  }

  // We want to return "false" in any other case
  return false
}
