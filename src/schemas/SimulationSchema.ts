import mongoose from 'mongoose'
import type { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

const CategorySchema = new Schema({
  alimentation: Number,
  transport: Number,
  logement: Number,
  divers: Number,
  'services sociétaux': Number,
})

const SubcategorySchema = new Schema({
  alimentation: Object,
  transport: Object,
  logement: Object,
  divers: Object,
  'services sociétaux': Object,
})

const MetricComputedResultsSchema = new Schema({
  bilan: Number,
  categories: CategorySchema,
  subcategories: SubcategorySchema,
})

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
      carbone: MetricComputedResultsSchema,
      eau: MetricComputedResultsSchema,
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
export type MetricComputedResultsType = FullInferSchemaType<
  typeof MetricComputedResultsSchema
>

SimulationSchema.index({ id: 1 })

export const Simulation = mongoose.model('Simulation', SimulationSchema)
