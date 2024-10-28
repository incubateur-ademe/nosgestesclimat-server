import { Poll } from '../../schemas/PollSchema'

export async function findUniquePollSlug(slug: string, counter = 0) {
  const organisationFound = await Poll.findOne({
    slug: counter === 0 ? slug : `${slug}-${counter}`,
  })

  if (organisationFound) {
    return findUniquePollSlug(slug, counter + 1)
  }

  return counter === 0 ? slug : `${slug}-${counter}`
}
