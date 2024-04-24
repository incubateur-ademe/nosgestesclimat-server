import { Situation } from '../../../types/types'
import { formatDottedName } from '../../../utils/formatDottedName'
import { DottedName } from '@incubateur-ademe/nosgestesclimat'

const POISSON_GRAS_DOTTEDNAME: DottedName =
  'alimentation . plats . poisson gras . nombre'

const POISSON_BLANC_DOTTEDNAME: DottedName =
  'alimentation . plats . poisson blanc . nombre'

const VIANDE_ROUGE_DOTTEDNAME: DottedName =
  'alimentation . plats . viande rouge . nombre'

const VIANDE_BLANCHE_DOTTEDNAME: DottedName =
  'alimentation . plats . viande blanche . nombre'

const VEGETARIEN_DOTTEDNAME: DottedName =
  'alimentation . plats . végétarien . nombre'

const VEGETALIEN_DOTTEDNAME: DottedName =
  'alimentation . plats . végétalien . nombre'

function eatsViandeRouge({ situation }: { situation: Situation }) {
  return (
    situation[formatDottedName(VIANDE_ROUGE_DOTTEDNAME)] === undefined ||
    (situation[formatDottedName(VIANDE_ROUGE_DOTTEDNAME)] as number) > 0
  )
}

function eatsViandeBlanche({ situation }: { situation: Situation }) {
  return (
    situation[formatDottedName(VIANDE_BLANCHE_DOTTEDNAME)] === undefined ||
    parseInt(situation[formatDottedName(VIANDE_BLANCHE_DOTTEDNAME)] as string) >
      0
  )
}

function eatsPoissonGras({ situation }: { situation: Situation }) {
  return (
    situation[formatDottedName(POISSON_GRAS_DOTTEDNAME)] === undefined ||
    parseInt(situation[formatDottedName(POISSON_GRAS_DOTTEDNAME)] as string) > 0
  )
}

function eatsPoissonBlanc({ situation }: { situation: Situation }) {
  return (
    situation[formatDottedName(POISSON_BLANC_DOTTEDNAME)] === undefined ||
    parseInt(situation[formatDottedName(POISSON_BLANC_DOTTEDNAME)] as string) >
      0
  )
}

export function getIsVegetarian({ situation }: { situation: Situation }) {
  if (!situation) {
    return false
  }

  // If question is skipped
  if (
    situation &&
    !situation[formatDottedName(VIANDE_ROUGE_DOTTEDNAME)] &&
    !situation[formatDottedName(VIANDE_BLANCHE_DOTTEDNAME)] &&
    !situation[formatDottedName(POISSON_GRAS_DOTTEDNAME)] &&
    !situation[formatDottedName(POISSON_BLANC_DOTTEDNAME)] &&
    !situation[formatDottedName(VEGETARIEN_DOTTEDNAME)] &&
    !situation[formatDottedName(VEGETALIEN_DOTTEDNAME)]
  ) {
    return false
  }

  return (
    !eatsViandeRouge({ situation }) &&
    !eatsViandeBlanche({ situation }) &&
    !eatsPoissonGras({ situation }) &&
    !eatsPoissonBlanc({ situation })
  )
}
