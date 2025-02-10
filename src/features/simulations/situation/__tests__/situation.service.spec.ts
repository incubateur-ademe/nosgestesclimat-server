import type {
  DottedName,
  FunFacts,
  NGCRule,
} from '@incubateur-ademe/nosgestesclimat'
import modelRules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import modelFunFacts from '@incubateur-ademe/nosgestesclimat/public/funFactsRules.json'
import personas from '@incubateur-ademe/nosgestesclimat/public/personas-fr.json'
import { engine } from '../../../../constants/publicode'
import type { SituationSchema } from '../../simulations.validator'
import { getSituationDottedNameValue } from '../situation.service'

const frRules = modelRules as Record<DottedName, NGCRule | string | null>
const funFactsRules = modelFunFacts as { [k in keyof FunFacts]: DottedName }

const getEngineSituationDottedNameValue = ({
  situation,
  dottedName,
}: {
  situation: SituationSchema
  dottedName: DottedName
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
  } catch {
    return 0
  }
}

describe('getSituationDottedNameValue', () => {
  describe.each(
    Object.entries(funFactsRules)
      .filter(([_, dottedName]) => dottedName in frRules)
      .map(([funFactRule, dottedName]) => ({ funFactRule, dottedName }))
  )('Given $funFactRule', ({ dottedName }) => {
    describe.each(
      Object.values(personas).map(({ nom, situation }) => ({ nom, situation }))
    )('When computing funfacts for persona $nom', ({ situation }) => {
      it('Should give the same result as the engine', () => {
        expect(
          getSituationDottedNameValue({
            dottedName,
            situation,
            rules: frRules,
          })
        ).toBe(getEngineSituationDottedNameValue({ situation, dottedName }))
      })
    })
  })
})
