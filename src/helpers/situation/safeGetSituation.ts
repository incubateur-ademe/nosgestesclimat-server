import type { DottedName } from '@incubateur-ademe/nosgestesclimat'
import type { Situation } from '../../types/types'

export const safeGetSituation = ({
  situation,
  everyRules,
}: {
  situation: Situation
  everyRules: Set<DottedName>
}): Situation => {
  const unsupportedDottedNamesFromSituation = (
    Object.keys(situation) as DottedName[]
  ).filter((ruleName) => {
    // We check if the dotteName is a rule of the model
    if (!everyRules.has(ruleName)) {
      return true
    }

    // Value should never be an empty string
    if (situation[ruleName] === '') {
      return true
    }

    // We check if the value from a mutliple choices question `dottedName`
    // is defined as a rule `dottedName . value` in the model.
    // If not, the value in the situation is an old option, that is not an option anymore.
    if (
      typeof situation[ruleName] === 'string' &&
      situation[ruleName] !== 'oui' &&
      situation[ruleName] !== 'non' &&
      !everyRules.has(
        `${ruleName} . ${(situation[ruleName] as string)?.replaceAll(
          /^'|'$/g,
          ''
        )}` as DottedName
      )
    ) {
      return false
    }
    return false
  })

  const filteredSituation = { ...situation }

  unsupportedDottedNamesFromSituation.map((ruleName) => {
    // If a dottedName is not supported in the model, it is dropped from the situation.
    delete filteredSituation[ruleName]
  })

  return filteredSituation
}
