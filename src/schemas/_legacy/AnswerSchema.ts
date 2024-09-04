import mongoose from 'mongoose'
import type {
  FullInferSchemaType,
  LeanInferSchemaType,
} from '../../types/types'

const Schema = mongoose.Schema

const AnswerSchema = new Schema(
  {
    data: {
      total: Number,
      progress: Number,
      byCategory: {
        type: Map,
        of: Number,
      },
      // context will be empty if there is no context related to the survey.
      context: {
        type: Map,
      },
    },
    survey: String,
    id: String,
  },
  {
    timestamps: true,
  }
)

export type AnswerType = FullInferSchemaType<typeof AnswerSchema>

export type LeanAnswerType = LeanInferSchemaType<typeof AnswerSchema>

export default mongoose.model('Answer', AnswerSchema)
