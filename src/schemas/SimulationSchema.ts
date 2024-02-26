import mongoose, { ObjectId, RefType } from 'mongoose'

const Schema = mongoose.Schema

export type SimulationType = {
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
  poll?: RefType
  group?: RefType
  defaultAdditionalQuestionsAnswers?: {
    postalCode?: string
    birthdate?: string
  }
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
    date: {
      type: Date,
      required: true,
    },
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
    defaultAdditionalQuestionsAnswers: {
      postalCode: String,
      birthdate: String,
    },
  },
  {
    timestamps: true,
  }
)

export const Simulation = mongoose.model('Simulation', SimulationSchema)
