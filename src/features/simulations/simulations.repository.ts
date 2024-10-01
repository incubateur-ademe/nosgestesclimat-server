import { prisma } from '../../adapters/prisma/client'
import { type SimulationCreateDto } from './simulations.validator'

export const createUserSimulation = async ({
  user: { id: userId, name, email },
  id,
  actionChoices,
  computedResults,
  date,
  foldedSteps,
  progression,
  situation,
  savedViaEmail,
  additionalQuestionsAnswers,
}: SimulationCreateDto) => {
  const user = await prisma.user.upsert({
    where: {
      id: userId,
    },
    create: {
      id: userId,
      name,
      email,
    },
    update: {
      name,
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  const simulation = await prisma.simulation.upsert({
    where: {
      id,
    },
    create: {
      id,
      date,
      userId,
      situation,
      foldedSteps,
      progression,
      actionChoices,
      savedViaEmail,
      computedResults,
      ...(!!additionalQuestionsAnswers?.length
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
      id,
      date,
      userId,
      situation,
      foldedSteps,
      progression,
      actionChoices,
      savedViaEmail,
      computedResults,
      additionalQuestionsAnswers: {
        deleteMany: {
          simulationId: id,
        },
        ...(!!additionalQuestionsAnswers?.length
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
    select: {
      id: true,
      date: true,
      situation: true,
      foldedSteps: true,
      progression: true,
      actionChoices: true,
      savedViaEmail: true,
      computedResults: true,
      additionalQuestionsAnswers: {
        select: {
          key: true,
          answer: true,
          type: true,
        },
      },
      polls: {
        select: {
          pollId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    simulation,
    user,
  }
}
