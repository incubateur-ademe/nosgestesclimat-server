export function formatObjectKeysForMongoDB(
  objectToFormat: Record<string, any>
) {
  return Object.keys(objectToFormat).reduce((acc, key) => {
    const newKey: string = encodeURIComponent(key)
    acc[newKey] = objectToFormat[key]
    return acc
  }, {} as Record<string, any>)
}

export function formatStringArrayForMongoDB(arrayToFormat: any[]) {
  return arrayToFormat.map((string) => encodeURIComponent(string))
}

export function unformatObjectKeysFromMongoDB(
  objectToUnformat: Record<string, any>
) {
  return Object.keys(objectToUnformat).reduce((acc, key) => {
    const newKey: string = decodeURIComponent(key)
    acc[newKey] = objectToUnformat[key]
    return acc
  }, {} as Record<string, any>)
}

export function unformatStringArrayFromMongoDB(arrayToUnformat: any[]) {
  return arrayToUnformat.map((string) => decodeURIComponent(string))
}
