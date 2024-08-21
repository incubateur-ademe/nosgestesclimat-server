import type { Types } from 'mongoose'
import { Organisation } from '../../schemas/OrganisationSchema'

type Props = {
  _id: Types.ObjectId
  administratorEmail: string
  updates: {
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
}

export async function handleUpdateOrganisation({
  _id,
  administratorEmail,
  updates: {
    email,
    organisationName,
    uniqueSlug,
    administratorName,
    position,
    administratorTelephone,
    hasOptedInForCommunications,
    organisationType,
    numberOfCollaborators,
  },
}: Props) {
  // Update organisation using findOneAndUpdate
  return await Organisation.findOneAndUpdate(
    {
      _id,
      'administrators.email': administratorEmail,
    },
    {
      $set: {
        ...(organisationName && { name: organisationName }),
        ...(uniqueSlug && { slug: uniqueSlug }),
        ...(administratorName && {
          'administrators.$.name': administratorName,
        }),
        ...(position && { 'administrators.$.position': position }),
        ...(administratorTelephone && {
          'administrators.$.telephone': administratorTelephone,
        }),
        ...(hasOptedInForCommunications !== undefined && {
          'administrators.$.hasOptedInForCommunications':
            hasOptedInForCommunications,
        }),
        ...(organisationType && { organisationType: organisationType }),
        ...(numberOfCollaborators && { numberOfCollaborators }),
        ...(email &&
          email !== administratorEmail && { 'administrators.$.email': email }),
      },
    },
    {
      new: true,
    }
  )
}
