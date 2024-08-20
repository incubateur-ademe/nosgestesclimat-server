import { unformatKey } from './unformatKey'

export function unformatSituation(situation?: { [key: string]: unknown }) {
  return Object.entries({ ...situation }).reduce(
    (acc: { [key: string]: unknown }, [key, value]: [string, unknown]) => {
      // Key is not formatted
      if (!key.includes('_')) {
        acc[key] = value
        return acc
      }

      let keyUnformatted = unformatKey(key)

      const wordsToHardcode = {
        't shirt': 't-shirt',
        'sèche linge': 'sèche-linge',
        'lave linge': 'lave-linge',
        'lave vaisselle': 'lave-vaisselle',
        'micro onde': 'micro-onde',
        'éco construit': 'éco-construit',
      }

      for (const [keyToHardcode, valueToHardcode] of Object.entries(
        wordsToHardcode
      )) {
        if (keyUnformatted.includes(keyToHardcode)) {
          keyUnformatted = keyUnformatted.replace(
            keyToHardcode,
            valueToHardcode
          )
        }
      }

      acc[keyUnformatted] = value

      return acc
    },
    {}
  )
}
