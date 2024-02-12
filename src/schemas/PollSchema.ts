import mongoose, { RefType } from 'mongoose'

const Schema = mongoose.Schema

export type PollType = {
  simulations: RefType[]
  startDate: Date
  endDate: Date
  name: string
  slug: string
  defaultAdditionalQuestions: string[]
  expectedNumberOfParticipants: number
}

// Should this include a reference to the parent organisation?
export const PollSchema = new Schema<PollType>(
  {
    simulations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulation',
      },
    ],
    startDate: Date,
    endDate: Date,
    name: String,
    slug: String,
    defaultAdditionalQuestions: [String],
    expectedNumberOfParticipants: Number,
  },
  {
    timestamps: true,
  }
)

export const Poll = mongoose.model('Poll', PollSchema)
