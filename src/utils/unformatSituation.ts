export function unformatSituation(situation?: { [key: string]: any }) {
  return Object.entries({ ...situation } as { [key: string]: any }).reduce(
    (acc: { [key: string]: any }, [key, value]: [string, any]) => {
      acc[key.replaceAll(' . ', '_').replaceAll(' ', '-')] = value
      return acc
    },
    {}
  )
}
