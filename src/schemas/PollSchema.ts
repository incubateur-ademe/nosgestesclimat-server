import mongoose, { RefType } from 'mongoose'
import { nanoid } from 'nanoid'
import { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

export type CustomAdditionalQuestionType = FullInferSchemaType<
  typeof CustomAdditionalQuestionSchema
>

export type PollType = FullInferSchemaType<typeof PollSchema>

const CustomAdditionalQuestionSchema = new Schema({
  question: String,
  isEnabled: Boolean,
})

// Should this include a reference to the parent organisation?
export const PollSchema = new Schema(
  {
    name: String,
    slug: {
      type: String,
      default: () => nanoid(6),
      unique: true,
    },
    simulations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulation',
      },
    ],
    startDate: Date,
    endDate: Date,
    defaultAdditionalQuestions: [String],
    expectedNumberOfParticipants: Number,
    customAdditionalQuestions: [CustomAdditionalQuestionSchema],
  },
  {
    timestamps: true,
  }
)

export const Poll = mongoose.model('Poll', PollSchema)
