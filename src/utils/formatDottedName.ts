export function formatDottedName(dottedName: string) {
  return dottedName.replaceAll(' . ', '_').replaceAll(' ', '-')
}

export function unformatDottedName(dottedName: string) {
  return dottedName.replaceAll('_', ' . ').replaceAll('-', ' ')
}
