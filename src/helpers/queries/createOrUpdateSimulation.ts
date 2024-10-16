import type { Types } from 'mongoose'
import { prisma } from '../../adapters/prisma/client'
import {
  SimulationAdditionalQuestionAnswerType,
  type AdditionalQuestionsAnswersSchema,
} from '../../features/simulations/simulations.validator'
import logger from '../../logger'
import type { LeanSimulationType } from '../../schemas/SimulationSchema'
import { Simulation } from '../../schemas/SimulationSchema'
import type { UserType } from '../../schemas/UserSchema'
import type { ModelToDto } from '../../types/types'

export type SimulationCreateObject = Omit<
  ModelToDto<LeanSimulationType>,
  '_id' | 'createdAt' | 'updatedAt' | 'user' | 'date' | 'polls'
> & {
  user: Types.ObjectId
  date: Date
  polls: Types.ObjectId[]
}

export const findVerifiedUser = async (
  userId: string,
  simulationId: string
): Promise<{
  email?: string | null | undefined
}> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  })

  if (!user) {
    logger.warn(
      `Could not find user for userId ${userId}. Trying in Verified users`
    )
  }

  const { email } = user || {}

  if (email) {
    const verifiedUser = await prisma.verifiedUser.findUnique({
      where: {
        email,
      },
      select: {
        email: true,
      },
    })

    return verifiedUser ? verifiedUser : {}
  }
  const verifiedUsers = await prisma.verifiedUser.findMany({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!verifiedUsers.length) {
    return {}
  }

  if (verifiedUsers.length > 1) {
    logger.warn(
      `Found more than one user for userId ${userId}, simulation ${simulationId}. Taking first one`
    )
  }

  const [verifiedUser] = verifiedUsers

  return verifiedUser
}

type AditionalQuestionAnswer = {
  type: 'default' | 'custom'
  key: string
  answer: string
}

export const getSimulationAdditionalQuestionsAnswers = ({
  defaultAdditionalQuestionsAnswers = {},
  customAdditionalQuestionsAnswers = {},
}: {
  defaultAdditionalQuestionsAnswers?: {
    birthdate?: string
    postalCode?: string
  }
  customAdditionalQuestionsAnswers?: Record<string, string>
}) => {
  return [
    ...Object.entries(defaultAdditionalQuestionsAnswers).reduce(
      (acc: AditionalQuestionAnswer[], [key, value]) => {
        acc.push({
          type: SimulationAdditionalQuestionAnswerType.default,
          key,
          answer: value?.toString() || '',
        })

        return acc
      },
      []
    ),
    ...Object.entries(customAdditionalQuestionsAnswers).reduce(
      (acc: AditionalQuestionAnswer[], [key, value]) => {
        acc.push({
          type: SimulationAdditionalQuestionAnswerType.custom,
          key,
          answer: value?.toString() || '',
        })

        return acc
      },
      []
    ),
  ] as AdditionalQuestionsAnswersSchema
}

export async function createOrUpdateSimulation(
  simulationToAdd: SimulationCreateObject,
  userDocument: UserType
) {
  const simulation = await Simulation.findOneAndUpdate(
    {
      id: simulationToAdd.id,
    },
    simulationToAdd,
    { upsert: true, new: true }
  )

  try {
    const id = simulationToAdd.id!
    const {
      actionChoices,
      computedResults,
      date,
      progression,
      foldedSteps,
      savedViaEmail,
      situation,
      polls,
    } = simulationToAdd
    const userId = userDocument.userId
    const { email } = await findVerifiedUser(userId, simulationToAdd.id!)

    const additionalQuestionsAnswers =
      getSimulationAdditionalQuestionsAnswers(simulationToAdd)

    await prisma.simulation.upsert({
      where: {
        id,
      },
      create: {
        id,
        actionChoices,
        computedResults: computedResults!,
        date,
        progression: progression!,
        foldedSteps: foldedSteps!,
        savedViaEmail: !!savedViaEmail,
        situation,
        userId,
        userEmail: email,
        ...(!!additionalQuestionsAnswers.length
          ? {
              additionalQuestionsAnswers: {
                createMany: {
                  data: additionalQuestionsAnswers.map(
                    ({ type, key, answer }) => ({
                      type,
                      key,
                      answer,
                    })
                  ),
                },
              },
            }
          : {}),
      },
      update: {
        date,
        progression: progression!,
        computedResults: computedResults!,
        savedViaEmail: !!savedViaEmail,
        actionChoices,
        userId,
        situation,
        userEmail: email,
        polls: {
          deleteMany: {
            simulationId: id,
          },
        },
        foldedSteps: foldedSteps!,
        additionalQuestionsAnswers: {
          deleteMany: {
            simulationId: id,
          },
          ...(!!additionalQuestionsAnswers.length
            ? {
                createMany: {
                  data: additionalQuestionsAnswers.map(
                    ({ type, key, answer }) => ({
                      type,
                      key,
                      answer,
                    })
                  ),
                },
              }
            : {}),
        },
      },
    })

    await prisma.simulationPoll.createMany({
      data: polls.map((pollId) => ({
        pollId: pollId.toString(),
        simulationId: id,
      })),
    })
  } catch (error) {
    console.error(error)
    logger.error('postgre Simulations replication failed', error)
  }

  return simulation
}
