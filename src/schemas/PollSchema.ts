import mongoose, { RefType } from 'mongoose'
import { nanoid } from 'nanoid'

const Schema = mongoose.Schema

export type PollType = {
  simulations: RefType[]
  startDate: Date
  endDate: Date
  name: string
  slug: string
  defaultAdditionalQuestions: string[]
  customAdditionalQuestions?: Record<string, boolean>[]
  expectedNumberOfParticipants: number
  _id: string
}

const CustomAdditionalQuestionsSchema = new Schema({
  question: String,
  isEnabled: Boolean,
})

// Should this include a reference to the parent organisation?
export const PollSchema = new Schema<PollType>(
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
    customAdditionalQuestions: [CustomAdditionalQuestionsSchema],
  },
  {
    timestamps: true,
  }
)

export const Poll = mongoose.model('Poll', PollSchema)
