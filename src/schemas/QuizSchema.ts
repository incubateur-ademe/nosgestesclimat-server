import mongoose, { RefType } from 'mongoose'
import { nanoid } from 'nanoid'

const Schema = mongoose.Schema

export type QuizAnswerType = {
  simulationId: string
  answer: string
  isAnswerCorrect: string
}

export const QuizAnswerSchema = new Schema<QuizAnswerType>(
  {
    simulationId: String,
    answer: String,
    isAnswerCorrect: String,
  },
  {
    timestamps: true,
  }
)

export const QuizAnswer = mongoose.model('QuizAnswer', QuizAnswerSchema)
