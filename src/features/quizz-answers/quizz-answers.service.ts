import { transaction } from '../../adapters/prisma/transaction'
import type { QuizzAnswerCreateDto } from './quizz-answers.validator'

export const createNorthStarRating = (quizzAnswer: QuizzAnswerCreateDto) => {
  return transaction((session) =>
    session.quizzAnswer.upsert({
      where: {
        simulationId_answer: {
          simulationId: quizzAnswer.simulationId,
          answer: quizzAnswer.answer,
        },
      },
      create: quizzAnswer,
      update: quizzAnswer,
    })
  )
}
