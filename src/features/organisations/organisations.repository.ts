import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import slugify from 'slugify'
import { prisma } from '../../adapters/prisma/client'
import type {
  OrganisationCreateDto,
  OrganisationParams,
  OrganisationPollCreateDto,
  OrganisationPollParams,
  OrganisationPollUpdateDto,
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

export const organisationSelectionWithoutPolls = {
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
  createdAt: true,
  updatedAt: true,
}

const defaultOrganisationSelection = {
  ...organisationSelectionWithoutPolls,
  polls: {
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  },
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

const findOrganisationPollBySlugOrId = <
  T extends Prisma.PollSelect = { id: true },
>(
  { organisationIdOrSlug, pollIdOrSlug }: OrganisationPollParams,
  { email: userEmail }: NonNullable<Request['user']>,
  select: T = { id: true } as T
) => {
  return prisma.poll.findFirstOrThrow({
    where: {
      OR: [{ id: pollIdOrSlug }, { slug: pollIdOrSlug }],
      organisation: {
        OR: [{ id: organisationIdOrSlug }, { slug: organisationIdOrSlug }],
        administrators: {
          some: {
            userEmail,
          },
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

    if (email) {
      organisationUpdate.administrators.update.data.userEmail = email
    }
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

export const defaultPollSelection = {
  id: true,
  name: true,
  slug: true,
  organisationId: true,
  defaultAdditionalQuestions: true,
  customAdditionalQuestions: true,
  expectedNumberOfParticipants: true,
  createdAt: true,
  updatedAt: true,
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
      ...defaultOrganisationSelection,
      polls: {
        where: {
          slug,
        },
        select: defaultPollSelection,
      },
    },
  })
}

export const updateOrganisationPoll = async (
  params: OrganisationPollParams,
  {
    name,
    expectedNumberOfParticipants,
    defaultAdditionalQuestions,
    customAdditionalQuestions: updateCustomAdditionalQuestions,
  }: OrganisationPollUpdateDto,
  user: NonNullable<Request['user']>
) => {
  const {
    id,
    customAdditionalQuestions: existingCustomAdditionalQuestions,
    defaultAdditionalQuestions: existingDefaultAdditionalQuestions,
  } = await findOrganisationPollBySlugOrId(params, user, {
    id: true,
    customAdditionalQuestions: true,
    defaultAdditionalQuestions: true,
  })

  const customAdditionalQuestions =
    updateCustomAdditionalQuestions || existingCustomAdditionalQuestions

  return prisma.poll.update({
    where: { id },
    data: {
      name,
      expectedNumberOfParticipants,
      ...(!!customAdditionalQuestions
        ? {
            customAdditionalQuestions,
          }
        : {}),
      ...(!!defaultAdditionalQuestions
        ? {
            defaultAdditionalQuestions: {
              ...(!!existingDefaultAdditionalQuestions.length
                ? {
                    deleteMany: {
                      id: {
                        in: existingDefaultAdditionalQuestions.map(
                          ({ id }) => id
                        ),
                      },
                    },
                  }
                : {}),
              ...(!!defaultAdditionalQuestions.length
                ? {
                    createMany: {
                      data: defaultAdditionalQuestions.map((type) => ({
                        type,
                      })),
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
    select: {
      ...defaultPollSelection,
      organisation: {
        select: organisationSelectionWithoutPolls,
      },
    },
  })
}

export const deleteOrganisationPoll = async (
  params: OrganisationPollParams,
  user: NonNullable<Request['user']>
) => {
  return prisma.poll.delete({
    where: await findOrganisationPollBySlugOrId(params, user),
    select: {
      organisation: {
        select: organisationSelectionWithoutPolls,
      },
    },
  })
}

export const fetchOrganisationPolls = async (
  params: OrganisationParams,
  user: NonNullable<Request['user']>
) => {
  return prisma.organisation.findUniqueOrThrow({
    where: await findOrganisationBySlugOrId(params, user),
    select: {
      polls: {
        select: defaultPollSelection,
      },
    },
  })
}

export const fetchOrganisationPoll = (
  params: OrganisationPollParams,
  user: NonNullable<Request['user']>
) => {
  return findOrganisationPollBySlugOrId(params, user, defaultPollSelection)
}

export const getLastPollParticipantsCount = async (organisationId: string) => {
  /**
   * Prisma does not handle the greatest-n-per-group
   * https://github.com/prisma/prisma/discussions/17994
   *
   * We could replace it with
   *   const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>(
   * Prisma.sql`
   *   Select count(id) from "SimulationPoll" where "pollId" in
   *   (Select p1.id from "Poll" p1 left outer join "Poll" p2 on p1."organisationId" = p2."organisationId"
   *   and (p1."createdAt" < p2."createdAt" or (p1."createdAt" = p2."createdAt" and p1.id < p2.id))
   *   where p1."organisationId" = ${organisationId} and p2.id is null)
   * `)
   *
   * But less readable
   */

  let count = 0
  const poll = await prisma.poll.findFirst({
    where: {
      organisationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
    },
  })

  if (poll) {
    count = await prisma.simulationPoll.count({
      where: {
        pollId: poll.id,
      },
    })
  }

  return count
}
