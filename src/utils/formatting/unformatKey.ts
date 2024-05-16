export function unformatKey(key: string) {
  return key.replaceAll('_', ' . ').replaceAll('-', ' ')
}
