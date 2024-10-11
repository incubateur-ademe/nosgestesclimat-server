import type { Request } from 'express'
import slugify from 'slugify'
import { prisma } from '../../adapters/prisma/client'
import type {
  OrganisationCreateDto,
  OrganisationParams,
  OrganisationUpdateDto,
} from './organisations.validator'

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

const defaultOrganisationSelection = {
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

const findOrganisationBySlugOrId = (
  { organisationIdOrSlug }: OrganisationParams,
  { email: userEmail }: NonNullable<Request['user']>
) => {
  return prisma.organisation.findFirstOrThrow({
    where: {
      OR: [{ id: organisationIdOrSlug }, { slug: organisationIdOrSlug }],
      administrators: {
        some: {
          userEmail,
        },
      },
    },
    select: {
      id: true,
    },
  })
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
    select: defaultOrganisationSelection,
  })

  return {
    organisation,
    administrator,
  }
}

export const updateAdministratorOrganisation = async (
  params: OrganisationParams,
  {
    name: organisationName,
    type,
    numberOfCollaborators,
    administrators,
  }: OrganisationUpdateDto,
  user: NonNullable<Request['user']>
) => {
  const { email: userEmail } = user
  const organisationUpdate = {
    type,
    name: organisationName,
    numberOfCollaborators,
    administrators: {
      update: {
        where: {
          userEmail,
        },
        data: {
          userEmail,
        },
      },
    },
  }

  let administrator
  if (administrators) {
    const [
      {
        email,
        name: administratorName,
        optedInForCommunications,
        position,
        telephone,
      },
    ] = administrators

    // update administrator
    administrator = await prisma.verifiedUser.update({
      where: {
        email: userEmail,
      },
      data: {
        name: administratorName,
        email,
        position,
        telephone,
        optedInForCommunications,
      },
      ...defaultUserSelection,
    })

    organisationUpdate.administrators.update.data.userEmail = email
  }

  // update organisation
  const organisation = await prisma.organisation.update({
    where: await findOrganisationBySlugOrId(params, user),
    data: organisationUpdate,
    select: defaultOrganisationSelection,
  })

  return {
    organisation,
    administrator,
  }
}
