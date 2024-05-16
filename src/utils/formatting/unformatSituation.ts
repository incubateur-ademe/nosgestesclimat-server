import { unformatKey } from './unformatKey'

export function unformatSituation(situation?: { [key: string]: any }) {
  return Object.entries({ ...situation } as { [key: string]: any }).reduce(
    (acc: { [key: string]: any }, [key, value]: [string, any]) => {
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
