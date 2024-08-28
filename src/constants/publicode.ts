import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import Engine from 'publicodes'

export const engine = new Engine(rules, {
  logger: {
    log: () => null,
    warn: () => null,
    error: console.error,
  },
})
