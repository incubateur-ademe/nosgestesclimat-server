import { Poll } from '../../schemas/PollSchema'
import { getSlug } from '../../utils/getSlug'

export async function findUniquePollSlug(name: string, counter = 0) {
  const slug = getSlug(name)

  const organisationFound = await Poll.findOne({
    slug: counter === 0 ? slug : `${slug}-${counter}`,
  })

  if (organisationFound) {
    return findUniquePollSlug(slug, counter + 1)
  }

  return counter === 0 ? slug : `${slug}-${counter}`
}
