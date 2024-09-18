import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import slugify from 'slugify'
import { prisma } from '../../adapters/prisma/client'
import type {
  OrganisationCreateDto,
  OrganisationParams,
  OrganisationPollCreateDto,
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

const findModelUniqueSlug = (
  model: typeof prisma.organisation | typeof prisma.poll
) => {
  const findUniqueSlug = async (name: string, counter = 0): Promise<string> => {
    const slug =
      counter === 0
        ? slugify(name.toLowerCase(), {
            strict: true,
          })
        : name

    // @ts-expect-error 2349 the two models are different but that's OK
    const entityFound = await model.findUnique({
      where: {
        slug: counter === 0 ? slug : `${slug}-${counter}`,
      },
      select: {
        slug: true,
      },
    })

    if (entityFound) {
      return findUniqueSlug(slug, counter + 1)
    }

    return counter === 0 ? slug : `${slug}-${counter}`
  }

  return findUniqueSlug
}

const findOrganisationBySlugOrId = <
  T extends Prisma.OrganisationSelect = { id: true },
>(
  { organisationIdOrSlug }: OrganisationParams,
  { email: userEmail }: NonNullable<Request['user']>,
  select: T = { id: true } as T
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
    select,
  })
}

const findUniqueOrganisationSlug = findModelUniqueSlug(prisma.organisation)

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

export const fetchUserOrganisations = ({
  email: userEmail,
}: NonNullable<Request['user']>) => {
  return prisma.organisation.findMany({
    where: {
      administrators: {
        some: {
          userEmail,
        },
      },
    },
    select: defaultOrganisationSelection,
  })
}

export const fetchUserOrganisation = (
  params: OrganisationParams,
  user: NonNullable<Request['user']>
) => {
  return findOrganisationBySlugOrId(params, user, defaultOrganisationSelection)
}

const findUniquePollSlug = findModelUniqueSlug(prisma.poll)

export const createOrganisationPoll = async (
  params: OrganisationParams,
  {
    name,
    expectedNumberOfParticipants,
    defaultAdditionalQuestions,
    customAdditionalQuestions = [],
  }: OrganisationPollCreateDto,
  user: NonNullable<Request['user']>
) => {
  const slug = await findUniquePollSlug(name)

  return prisma.organisation.update({
    where: await findOrganisationBySlugOrId(params, user),
    data: {
      polls: {
        create: {
          slug,
          name,
          customAdditionalQuestions,
          expectedNumberOfParticipants,
          ...(!!defaultAdditionalQuestions?.length
            ? {
                defaultAdditionalQuestions: {
                  createMany: {
                    data: defaultAdditionalQuestions.map((type) => ({
                      type,
                    })),
                  },
                },
              }
            : {}),
        },
      },
    },
    select: {
      polls: {
        where: {
          slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          defaultAdditionalQuestions: true,
          customAdditionalQuestions: true,
          expectedNumberOfParticipants: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })
}
