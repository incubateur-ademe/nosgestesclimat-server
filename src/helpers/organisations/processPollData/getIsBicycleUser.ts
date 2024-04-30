import { DottedName } from '@incubateur-ademe/nosgestesclimat'
import { Situation } from '../../../types/types'
import { formatDottedName } from '../../../utils/formatDottedName'

const VELO_DOTTEDNAME: DottedName =
  'transport . mobilité douce . vélo . présent'
const VAE_DOTTEDNAME: DottedName = 'transport . mobilité douce . vae . présent'

export function getIsBicycleUser({ situation }: { situation: Situation }) {
  if (!situation) {
    return false
  }

  // If question is skipped
  if (
    situation &&
    !situation[formatDottedName(VELO_DOTTEDNAME)] &&
    !situation[formatDottedName(VAE_DOTTEDNAME)]
  ) {
    return false
  }

  return (
    situation[formatDottedName(VELO_DOTTEDNAME)] === 'oui' ||
    situation[formatDottedName(VAE_DOTTEDNAME)] === 'oui'
  )
}
