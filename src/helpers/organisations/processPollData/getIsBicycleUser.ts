import { Situation } from '../../../types/types'
import { formatDottedName } from '../../../utils/formatDottedName'

export function getIsBicycleUser({ situation }: { situation: Situation }) {
  if (!situation) {
    return false
  }

  // If question is skipped
  if (
    situation &&
    !situation[
      formatDottedName('transport . mobilité douce . vélo . présent')
    ] &&
    !situation[formatDottedName('transport . mobilité douce . vae . présent')]
  ) {
    return false
  }

  return (
    situation[
      formatDottedName('transport . mobilité douce . vélo . présent')
    ] === 'oui' ||
    situation[
      formatDottedName('transport . mobilité douce . vae . présent')
    ] === 'oui'
  )
}
