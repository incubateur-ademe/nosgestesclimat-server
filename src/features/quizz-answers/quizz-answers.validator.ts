import z from 'zod'

export enum QuizzAnswerIsAnswerCorrectEnum {
  correct = 'correct',
  almost = 'almost',
  wrong = 'wrong',
}

const QuizzAnswerIsAnswerCorrect = z.enum([
  QuizzAnswerIsAnswerCorrectEnum.correct,
  QuizzAnswerIsAnswerCorrectEnum.almost,
  QuizzAnswerIsAnswerCorrectEnum.wrong,
])

export const QuizzAnswerCreateDto = z.object({
  isAnswerCorrect: QuizzAnswerIsAnswerCorrect,
  simulationId: z.string().uuid(),
  answer: z.string(),
})

export type QuizzAnswerCreateDto = z.infer<typeof QuizzAnswerCreateDto>

export const QuizzAnswerCreateValidator = {
  body: QuizzAnswerCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
