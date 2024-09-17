import type { Types } from 'mongoose'
import { prisma } from '../../adapters/prisma/client'
import logger from '../../logger'
import { Organisation } from '../../schemas/OrganisationSchema'

type Props = {
  _id: Types.ObjectId
  administratorEmail: string
  updates: {
    email: string
    organisationName: string
    uniqueSlug: string
    administratorName: string
    position: string
    administratorTelephone: string
    hasOptedInForCommunications: boolean
    organisationType: string
    numberOfCollaborators: number
  }
}

const getOrganisationType = (type?: string) => {
  if (!type) {
    return
  }

  switch (type) {
    case 'Association':
    case 'Asociación':
      return 'association'
    case 'Autre':
    case 'Other':
    case 'Otros':
      return 'other'
    case 'Company':
    case 'Entreprise':
    case 'Empresa':
      return 'company'
    case 'Coopérative':
    case 'Cooperative':
    case 'Cooperativa':
      return 'cooperative'
    case "Groupe d'amis":
    case 'Group of friends':
    case 'Grupo de amigos':
      return 'groupOfFriends'
    case 'Public ou collectivité territoriale':
    case 'Public or local authority':
    case 'Autoridad pública o local':
      return 'publicOrRegionalAuthority'
    case 'Université ou école':
    case 'University or school':
    case 'Universidad o escuela':
      return 'universityOrSchool'
    default:
      throw new Error(`unknown organisation type ${type}`)
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
  const updatedOrganisation = await Organisation.findOneAndUpdate(
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
          email !== administratorEmail && {
            'administrators.$.email': email,
          }),
      },
    },
    {
      new: true,
    }
  )

  try {
    await prisma.verifiedUser.update({
      where: {
        email: administratorEmail,
      },
      data: {
        name: administratorName,
        telephone: administratorTelephone,
        optedInForCommunications: hasOptedInForCommunications,
        position,
        ...(email &&
          email !== administratorEmail && {
            email,
          }),
      },
    })

    await prisma.organisation.upsert({
      where: {
        id: _id.toString(),
      },
      create: {
        id: _id.toString(),
        name: organisationName,
        slug: uniqueSlug,
        type: getOrganisationType(organisationType),
        numberOfCollaborators,
        administrators: {
          create: {
            userEmail: administratorEmail,
          },
        },
      },
      update: {
        name: organisationName,
        slug: uniqueSlug,
        type: getOrganisationType(organisationType),
        numberOfCollaborators,
        administrators: {
          update: {
            where: {
              userEmail: administratorEmail,
            },
            data: {
              userEmail: email,
            },
          },
        },
      },
    })
  } catch (error) {
    logger.error('postgre Organisations replication failed', error)
  }

  return updatedOrganisation
}
