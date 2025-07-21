import type { DottedName } from '@incubateur-ademe/nosgestesclimat'
import type Engine from 'publicodes'
import logger from '../../../logger'
import type { SituationSchema } from '../simulations.validator'

export const getSituationDottedNameValueWithEngine = ({
  dottedName,
  situation,
  engine,
}: {
  situation: SituationSchema
  dottedName: DottedName
  engine: Engine
}) => {
  try {
    engine.setSituation(situation)

    const value = engine.evaluate(dottedName).nodeValue

    if (typeof value === 'number' && !!value) {
      return value
    }

    if (value === true) {
      return 1
    }

    return 0
  } catch (error) {
    logger.error(`Cannot evaluate dottedName ${dottedName}`, {
      situation,
      error,
    })

    return 0
  }
}
