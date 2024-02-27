import { Organisation } from "../../schemas/OrganisationSchema";

export async function findUniqueSlug(orgaSlug: string, counter = 0) {
  const organisationFound = await Organisation.findOne({
    slug: counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`,
  });

  if (organisationFound) {
    return findUniqueSlug(orgaSlug, counter + 1);
  }

  return counter === 0 ? orgaSlug : `${orgaSlug}-${counter}`;
}