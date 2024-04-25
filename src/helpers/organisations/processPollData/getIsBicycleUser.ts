// should be using `import rules from '@incubateur-ademe/nosgestesclimat'` but got this error : SyntaxError: Cannot use import statement outside a module
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { Situation } from '../../../types/types'
import { processCondition } from './helpers/processCondition'

export function getIsBicycleUser({ situation }: { situation: Situation }) {
  return processCondition({
    situation,
    rule: rules['ui . organisations . roule en vélo'],
  })
}
