import mongoose from 'mongoose'
import type { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

export const SimulationSchema = new Schema(
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

export type SimulationType = FullInferSchemaType<typeof SimulationSchema>

SimulationSchema.index({ id: 1 })

export const Simulation = mongoose.model('Simulation', SimulationSchema)
