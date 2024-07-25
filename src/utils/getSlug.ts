import slugify from 'slugify'

export function getSlug(text: string) {
  return slugify(text.toLowerCase(), {
    strict: true,
  })
}
