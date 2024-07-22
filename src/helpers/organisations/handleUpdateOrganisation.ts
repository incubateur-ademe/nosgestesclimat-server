import { Mongoose, ObjectId, Types } from 'mongoose'
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
  console.log(position)
  // Update organisation using findOneAndUpdate
  return await Organisation.findOneAndUpdate(
    {
      _id,
      'administrators.email': administratorEmail,
    },
    {
      $set: {
        name: String(organisationName),
        ...(uniqueSlug && { slug: uniqueSlug }),
        'administrators.$.name': administratorName,
        'administrators.$.position': position,
        'administrators.$.telephone': administratorTelephone,
        'administrators.$.hasOptedInForCommunications':
          hasOptedInForCommunications,
        organisationType,
        numberOfCollaborators,
        ...(email &&
          email !== administratorEmail && { 'administrators.$.email': email }),
      },
    }
  )
}
