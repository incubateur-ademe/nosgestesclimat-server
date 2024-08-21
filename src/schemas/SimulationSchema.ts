import mongoose from 'mongoose'
import type { FullInferSchemaType, LeanInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

const CategorySchema = new Schema(
  {
    alimentation: Number,
    transport: Number,
    logement: Number,
    divers: Number,
    'services sociétaux': Number,
  },
  { _id: false }
)

const SubcategorySchema = new Schema(
  {
    type: Map,
    of: Number,
  },
  { _id: false }
)

const MetricComputedResultsSchema = new Schema(
  {
    bilan: Number,
    categories: CategorySchema,
    subcategories: SubcategorySchema,
  },
  { _id: false }
)

const ComputedResultsSchema = new Schema(
  {
    carbone: MetricComputedResultsSchema,
    eau: MetricComputedResultsSchema,
  },
  { _id: false }
)

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
    computedResults: ComputedResultsSchema,
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
export type LeanSimulationType = LeanInferSchemaType<typeof SimulationSchema>

SimulationSchema.index({ id: 1 })

export const Simulation = mongoose.model('Simulation', SimulationSchema)
