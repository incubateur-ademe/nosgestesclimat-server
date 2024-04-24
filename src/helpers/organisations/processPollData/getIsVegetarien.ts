import { Situation } from '../../../types/types'
import { formatDottedName } from '../../../utils/formatDottedName'

const POISSON_GRAS_DOTTEDNAME = formatDottedName(
  'alimentation . plats . poisson gras . nombre'
)
const POISSON_BLANC_DOTTEDNAME = formatDottedName(
  'alimentation . plats . poisson blanc . nombre'
)
const VIANDE_ROUGE_DOTTEDNAME = formatDottedName(
  'alimentation . plats . viande rouge . nombre'
)
const VIANDE_BLANCHE_DOTTEDNAME = formatDottedName(
  'alimentation . plats . viande blanche . nombre'
)

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
    !situation[
      formatDottedName('alimentation . plats . viande rouge . nombre')
    ] &&
    !situation[
      formatDottedName('alimentation . plats . viande blanche . nombre')
    ] &&
    !situation[
      formatDottedName('alimentation . plats . poisson gras . nombre')
    ] &&
    !situation[
      formatDottedName('alimentation . plats . poisson blanc . nombre')
    ] &&
    !situation[
      formatDottedName('alimentation . plats . végétarien . nombre')
    ] &&
    !situation[formatDottedName('alimentation . plats . végétalien . nombre')]
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
