import { DottedName } from '@incubateur-ademe/nosgestesclimat'
import { Situation } from '../../../types/types'
import { formatDottedName } from '../../../utils/formatDottedName'

const VOITURE_KM_DOTTEDNAME: DottedName = 'transport . voiture . km'

export function getIsDriver({ situation }: { situation: Situation }) {
  if (!situation) {
    return false
  }

  // If question is skipped
  if (situation && !situation[formatDottedName(VOITURE_KM_DOTTEDNAME)]) {
    return true
  }

  return (situation[formatDottedName(VOITURE_KM_DOTTEDNAME)] as number) > 0
}
