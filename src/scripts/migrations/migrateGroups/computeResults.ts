import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import Engine from 'publicodes'

export function computeResults(situation: { [key: string]: string }) {
  const engine = new Engine(rules)
  engine.setSituation(situation)

  return {
    bilan: engine.evaluate('bilan'),
    categories: {
      transport: engine.evaluate('transport'),
      alimentation: engine.evaluate('alimentation'),
      logement: engine.evaluate('logement'),
      divers: engine.evaluate('divers'),
      'services sociétaux': engine.evaluate('services sociétaux'),
    }
  }
}