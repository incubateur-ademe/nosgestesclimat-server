import { Organisation } from '../../schemas/OrganisationSchema'

export async function findUniqueOrgaSlug(orgaSlug: string, counter = 0) {
  const organisationFound = await Organisation.findOne({
    slug: counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`,
  })

  if (organisationFound) {
    return findUniqueOrgaSlug(orgaSlug, counter + 1)
  }

  return counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`
}
