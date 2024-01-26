/**
 * Legacy from previous version
 */
import mongoose from 'mongoose'

const Schema = mongoose.Schema

export const SimulationPreciseSchema = new Schema(
  {
    id: String,
    actionChoices: Object,
    conference: {
      type: Object,
      required: false,
    },
    config: {
      type: Object,
      required: false,
    },
    date: {
      type: Date,
      required: true,
    },
    enquête: {
      type: Object,
      required: false,
    },
    eventsSent: Object,
    foldedSteps: [String],
    hiddenNotifications: [String],
    persona: {
      type: Object,
      required: false,
    },
    ratings: {
      learned: String,
      action: String,
    },
    situation: {
      type: Object,
      required: false,
    },
    storedAmortissementAvion: {
      type: Object,
      required: false,
    },
    storedTrajets: {
      type: Object,
      required: false,
    },
    survey: {
      type: Object,
      required: false,
    },
    targetUnit: {
      type: String,
      required: false,
    },
    unfoldedStep: {
      type: String,
      required: false,
    },
    url: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

export const SimulationPreciseModel = mongoose.model(
  'SimulationPrecise',
  SimulationPreciseSchema
)
