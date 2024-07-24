import mongoose from 'mongoose'
import type { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

export const QuizAnswerSchema = new Schema(
  {
    simulationId: String,
    answer: String,
    isAnswerCorrect: String,
  },
  {
    timestamps: true,
  }
)

export type QuizAnswerType = FullInferSchemaType<typeof QuizAnswerSchema>

export const QuizAnswer = mongoose.model('QuizAnswer', QuizAnswerSchema)
