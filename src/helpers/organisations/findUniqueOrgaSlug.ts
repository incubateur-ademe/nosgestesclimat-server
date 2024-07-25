import { Organisation } from '../../schemas/OrganisationSchema'
import { getSlug } from '../../utils/getSlug'

export async function findUniqueOrgaSlug(name: string, counter = 0) {
  const orgaSlug = getSlug(name)

  const organisationFound = await Organisation.findOne({
    slug: counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`,
  })

  if (organisationFound) {
    return findUniqueOrgaSlug(orgaSlug, counter + 1)
  }

  return counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`
}
