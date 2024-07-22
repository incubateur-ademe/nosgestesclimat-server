import { Organisation } from '../../schemas/OrganisationSchema'

type Props = {
  email: string
  organisationName: string
  uniqueSlug?: string
  administratorName: string
  position: string
  administratorTelephone: string
  hasOptedInForCommunications: boolean
  organisationType: string
  numberOfCollaborators: number
}

export async function handleUpdateOrganisation({
  email,
  organisationName,
  uniqueSlug,
  administratorName,
  position,
  administratorTelephone,
  hasOptedInForCommunications,
  organisationType,
  numberOfCollaborators,
}: Props) {
  // Update organisation using findOneAndUpdate
  await Organisation.findOneAndUpdate(
    {
      'administrators.email': email,
    },
    {
      $set: {
        name: String(organisationName),
        ...(uniqueSlug && { slug: uniqueSlug }),
        'administrators.$[element].name': administratorName,
        'administrators.$[element].position': position,
        'administrators.$[element].telephone': administratorTelephone,
        'administrators.$[element].hasOptedInForCommunications':
          hasOptedInForCommunications,
        organisationType,
        numberOfCollaborators,
      },
    },
    {
      arrayFilters: [
        {
          'element.email': email,
        },
      ],
    }
  )
}
