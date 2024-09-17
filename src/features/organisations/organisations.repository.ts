import type { Request } from 'express'
import slugify from 'slugify'
import { prisma } from '../../adapters/prisma/client'
import type { OrganisationCreateDto } from './organisations.validator'

const defaultUserSelection = {
  select: {
    id: true,
    name: true,
    email: true,
    position: true,
    telephone: true,
    optedInForCommunications: true,
    createdAt: true,
    updatedAt: true,
  },
}

const findUniqueOrganisationSlug = async (
  name: string,
  counter = 0
): Promise<string> => {
  const slug =
    counter === 0
      ? slugify(name.toLowerCase(), {
          strict: true,
        })
      : name

  const organisationFound = await prisma.organisation.findUnique({
    where: {
      slug: counter === 0 ? slug : `${slug}-${counter}`,
    },
    select: {
      slug: true,
    },
  })

  if (organisationFound) {
    return findUniqueOrganisationSlug(slug, counter + 1)
  }

  return counter === 0 ? slug : `${slug}-${counter}`
}

export const createOrganisationAndAdministrator = async (
  {
    name,
    type,
    administrators: [
      {
        name: administratorName,
        telephone,
        optedInForCommunications,
        position,
      },
    ] = [{}],
    numberOfCollaborators,
  }: OrganisationCreateDto,
  { userId, email }: NonNullable<Request['user']>
) => {
  // upsert administrator
  const administrator = await prisma.verifiedUser.upsert({
    where: {
      email,
    },
    create: {
      email,
      id: userId,
      name: administratorName,
      position,
      telephone,
      optedInForCommunications,
    },
    update: {
      id: userId,
      name: administratorName,
      position,
      telephone,
      optedInForCommunications,
    },
    ...defaultUserSelection,
  })

  const slug = await findUniqueOrganisationSlug(name)

  // create organisation
  const organisation = await prisma.organisation.create({
    data: {
      name,
      slug,
      type,
      numberOfCollaborators,
      administrators: {
        create: {
          userEmail: email,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      numberOfCollaborators: true,
      administrators: {
        select: {
          id: true,
          user: defaultUserSelection,
        },
      },
      polls: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    organisation,
    administrator,
  }
}
