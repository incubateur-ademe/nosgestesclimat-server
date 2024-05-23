import { CustomAdditionalQuestionType } from './PollSchema'
import mongoose, { ObjectId, RefType } from 'mongoose'

const Schema = mongoose.Schema

type CustomAdditionalQuestionAnswerType = Record<string, string>

export interface SimulationType {
  id: string
  user?: RefType
  actionChoices: Record<string, unknown>
  progression: number
  date: Date
  foldedSteps: string[]
  situation: Record<string, any>
  computedResults: {
    bilan: number
    categories: Record<string, number>
  }
  // poll and group are legacy. They can safely be deleted once the migration is done
  poll?: RefType
  group?: RefType
  polls?: RefType[]
  groups?: RefType[]
  defaultAdditionalQuestionsAnswers?: {
    postalCode?: string
    birthdate?: string
  }
  customAdditionalQuestionsAnswers?: CustomAdditionalQuestionAnswerType
  savedViaEmail?: boolean
  modifiedAt?: Date
  createdAt?: Date
  _id?: string
}

export const SimulationSchema = new Schema<SimulationType>(
  {
    // UI stored simulation id
    id: String,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actionChoices: Object,
    progression: Number,
    date: Date,
    foldedSteps: [String],
    situation: Object,
    computedResults: {
      bilan: Number,
      categories: {
        alimentation: Number,
        transport: Number,
        logement: Number,
        divers: Number,
        'services sociétaux': Number,
      },
    },
    poll: {
      type: Schema.Types.ObjectId,
      ref: 'Poll',
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },
    polls: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Poll',
      },
    ],
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    savedViaEmail: Boolean,
    defaultAdditionalQuestionsAnswers: {
      postalCode: String,
      birthdate: String,
    },
    customAdditionalQuestionsAnswers: Object,
  },
  {
    timestamps: true,
  }
)

SimulationSchema.index({ id: 1 })

export const Simulation = mongoose.model('Simulation', SimulationSchema)
