import type { FunFacts } from '@incubateur-ademe/nosgestesclimat'
import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import slugify from 'slugify'
import { prisma } from '../../adapters/prisma/client'
import {
  defaultOrganisationSelection,
  defaultOrganisationSelectionWithoutPolls,
  defaultPollSelection,
  defaultVerifiedUserSelection,
} from '../../adapters/prisma/selection'
import type { Session } from '../../adapters/prisma/transaction'
import { transaction } from '../../adapters/prisma/transaction'
import type { SimulationParams } from '../simulations/simulations.validator'
import type {
  OrganisationCreateDto,
  OrganisationParams,
  OrganisationPollCreateDto,
  OrganisationPollParams,
  OrganisationPollUpdateDto,
  OrganisationUpdateDto,
  PollParams,
} from './organisations.validator'

const findModelUniqueSlug = (model: 'organisation' | 'poll') => {
  const findUniqueSlug = async (
    name: string,
    { session }: { session: Session },
    counter = 0
  ): Promise<string> => {
    const slug =
      counter === 0
        ? slugify(name.toLowerCase(), {
            strict: true,
          })
        : name

    // @ts-expect-error 2349 the two models are different but that's OK
    const entityFound = await session[model].findUnique({
      where: {
        slug: counter === 0 ? slug : `${slug}-${counter}`,
      },
      select: {
        slug: true,
      },
    })

    if (entityFound) {
      return findUniqueSlug(slug, { session }, counter + 1)
    }

    return counter === 0 ? slug : `${slug}-${counter}`
  }

  return findUniqueSlug
}

const findOrganisationBySlugOrId = <
  T extends Prisma.OrganisationSelect = { id: true },
>(
  {
    params: { organisationIdOrSlug },
    user: { email: userEmail },
    select = { id: true } as T,
  }: {
    params: OrganisationParams
    user: NonNullable<Request['user']>
    select?: T
  },
  { session }: { session: Session }
) => {
  return session.organisation.findFirstOrThrow({
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
  {
    params: { organisationIdOrSlug, pollIdOrSlug },
    user: { email: userEmail },
    select = { id: true } as T,
  }: {
    params: OrganisationPollParams
    user: NonNullable<Request['user']>
    select?: T
  },
  { session }: { session: Session }
) => {
  return session.poll.findFirstOrThrow({
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

export const findOrganisationPublicPollBySlugOrId = <
  T extends Prisma.PollSelect = { id: true },
>(
  {
    params: { pollIdOrSlug },
    select = { id: true } as T,
  }: {
    params: PollParams
    select?: T
  },
  { session }: { session: Session }
) => {
  return session.poll.findFirstOrThrow({
    where: {
      OR: [{ id: pollIdOrSlug }, { slug: pollIdOrSlug }],
    },
    select,
  })
}

const findUniqueOrganisationSlug = findModelUniqueSlug('organisation')

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
  { userId, email }: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    // upsert administrator
    const administrator = await prismaSession.verifiedUser.upsert({
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
      select: defaultVerifiedUserSelection,
    })

    const slug = await findUniqueOrganisationSlug(name, {
      session: prismaSession,
    })

    // create organisation
    const organisation = await prismaSession.organisation.create({
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
  }, session)
}

export const updateAdministratorOrganisation = async (
  params: OrganisationParams,
  {
    name: organisationName,
    type,
    numberOfCollaborators,
    administrators,
  }: OrganisationUpdateDto,
  user: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
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
      administrator = await prismaSession.verifiedUser.update({
        where: {
          email: userEmail,
        },
        data: {
          id: user.userId,
          name: administratorName,
          email,
          position,
          telephone,
          optedInForCommunications,
        },
        select: defaultVerifiedUserSelection,
      })

      if (email) {
        user.email = email
        organisationUpdate.administrators.update.where.userEmail = email
        organisationUpdate.administrators.update.data.userEmail = email
      }
    }

    // update organisation
    const organisation = await prismaSession.organisation.update({
      where: await findOrganisationBySlugOrId(
        { params, user },
        { session: prismaSession }
      ),
      data: organisationUpdate,
      select: defaultOrganisationSelection,
    })

    return {
      organisation,
      administrator,
    }
  }, session)
}

export const fetchUserOrganisations = ({
  email: userEmail,
}: NonNullable<Request['user']>) => {
  return transaction((prismaSession) =>
    prismaSession.organisation.findMany({
      where: {
        administrators: {
          some: {
            userEmail,
          },
        },
      },
      select: defaultOrganisationSelection,
    })
  )
}

export const fetchUserOrganisation = (
  params: OrganisationParams,
  user: NonNullable<Request['user']>
) => {
  return transaction((prismaSession) =>
    findOrganisationBySlugOrId(
      {
        params,
        user,
        select: defaultOrganisationSelection,
      },
      { session: prismaSession }
    )
  )
}

const findUniquePollSlug = findModelUniqueSlug('poll')

export const createOrganisationPoll = async (
  params: OrganisationParams,
  {
    name,
    expectedNumberOfParticipants,
    defaultAdditionalQuestions,
    customAdditionalQuestions,
  }: OrganisationPollCreateDto,
  user: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const slug = await findUniquePollSlug(name, { session: prismaSession })

    return prismaSession.organisation.update({
      where: await findOrganisationBySlugOrId(
        { params, user },
        { session: prismaSession }
      ),
      data: {
        polls: {
          create: {
            slug,
            name,
            customAdditionalQuestions: customAdditionalQuestions ?? [],
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
  }, session)
}

export const updateOrganisationPoll = async (
  params: OrganisationPollParams,
  {
    name,
    expectedNumberOfParticipants,
    defaultAdditionalQuestions,
    customAdditionalQuestions: updateCustomAdditionalQuestions,
  }: OrganisationPollUpdateDto,
  user: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    const {
      id,
      customAdditionalQuestions: existingCustomAdditionalQuestions,
      defaultAdditionalQuestions: existingDefaultAdditionalQuestions,
    } = await findOrganisationPollBySlugOrId(
      {
        params,
        user,
        select: {
          id: true,
          customAdditionalQuestions: true,
          defaultAdditionalQuestions: true,
        },
      },
      { session: prismaSession }
    )

    const customAdditionalQuestions =
      updateCustomAdditionalQuestions || existingCustomAdditionalQuestions

    return prismaSession.poll.update({
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
      select: defaultPollSelection,
    })
  }, session)
}

export const deleteOrganisationPoll = async (
  params: OrganisationPollParams,
  user: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    return prismaSession.poll.delete({
      where: await findOrganisationPollBySlugOrId(
        { params, user },
        { session: prismaSession }
      ),
      select: {
        organisation: {
          select: defaultOrganisationSelectionWithoutPolls,
        },
      },
    })
  }, session)
}

export const fetchOrganisationPolls = async (
  params: OrganisationParams,
  user: NonNullable<Request['user']>,
  { session }: { session?: Session } = {}
) => {
  return transaction(async (prismaSession) => {
    return prismaSession.organisation.findUniqueOrThrow({
      where: await findOrganisationBySlugOrId(
        { params, user },
        { session: prismaSession }
      ),
      select: {
        polls: {
          select: defaultPollSelection,
        },
      },
    })
  }, session)
}

export const fetchOrganisationPoll = (
  params: OrganisationPollParams,
  user: NonNullable<Request['user']>
) => {
  return transaction((prismaSession) =>
    findOrganisationPollBySlugOrId(
      {
        params,
        user,
        select: defaultPollSelection,
      },
      { session: prismaSession }
    )
  )
}

export const fetchOrganisationPublicPoll = ({ pollIdOrSlug }: PollParams) => {
  return transaction((prismaSession) =>
    prismaSession.poll.findFirstOrThrow({
      where: {
        OR: [
          {
            id: pollIdOrSlug,
          },
          {
            slug: pollIdOrSlug,
          },
        ],
      },
      select: defaultPollSelection,
    })
  )
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

export const findSimulationPoll = (
  { simulationId }: SimulationParams,
  { session }: { session?: Session } = {}
) => {
  return transaction(
    (prismaSession) =>
      prismaSession.simulationPoll.findFirst({
        where: {
          simulationId,
        },
        select: {
          pollId: true,
          simulationId: true,
        },
      }),
    session
  )
}

export const setPollFunFacts = (
  id: string,
  funFacts: FunFacts,
  { session }: { session?: Session } = {}
) => {
  return transaction(
    (prismaSession) =>
      prismaSession.poll.update({
        where: {
          id,
        },
        data: {
          funFacts,
        },
        select: {
          id: true,
          funFacts: true,
        },
      }),
    session
  )
}
