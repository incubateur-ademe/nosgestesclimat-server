export function unformatSituation(situation?: { [key: string]: any }) {
  return Object.entries({ ...situation } as { [key: string]: any }).reduce(
    (acc: { [key: string]: any }, [key, value]: [string, any]) => {
      // Key is not formatted
      if (!key.includes('_')) {
        acc[key] = value
        return acc
      }

      const keyUnformatted = key.replaceAll('_', ' . ').replaceAll('-', ' ')

      const wordsToHardcode = {
        't shirt': 't-shirt',
        'sèche linge': 'sèche-linge',
        'lave linge': 'lave-linge',
        'lave vaisselle': 'lave-vaisselle',
        'micro onde': 'micro-onde',
        'éco construit': 'éco-construit',
      }

      let keyUnformattedHandlingHardcodedWords = keyUnformatted

      for (const [keyToHardcode, valueToHardcode] of Object.entries(
        wordsToHardcode
      )) {
        if (keyUnformatted.includes(keyToHardcode)) {
          keyUnformattedHandlingHardcodedWords = keyUnformatted.replace(
            keyToHardcode,
            valueToHardcode
          )
        }
      }

      acc[keyUnformattedHandlingHardcodedWords] = value

      return acc
    },
    {}
  )
}
