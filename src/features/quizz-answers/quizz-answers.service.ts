import { prisma } from '../../adapters/prisma/client'
import type { QuizzAnswerCreateDto } from './quizz-answers.validator'

export const createNorthStarRating = (quizzAnswer: QuizzAnswerCreateDto) => {
  return prisma.quizzAnswer.upsert({
    where: {
      simulationId_answer: {
        simulationId: quizzAnswer.simulationId,
        answer: quizzAnswer.answer,
      },
    },
    create: quizzAnswer,
    update: quizzAnswer,
  })
}
