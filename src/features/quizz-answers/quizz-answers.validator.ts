import { QuizzAnswerIsAnswerCorrect } from '@prisma/client'
import z from 'zod'

export const QuizzAnswerCreateDto = z.object({
  isAnswerCorrect: z.nativeEnum(QuizzAnswerIsAnswerCorrect),
  simulationId: z.string().uuid(),
  answer: z.string(),
})

export type QuizzAnswerCreateDto = z.infer<typeof QuizzAnswerCreateDto>

export const QuizzAnswerCreateValidator = {
  body: QuizzAnswerCreateDto,
  params: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
}
