/**
 * Legacy from previous version
 */
import mongoose from 'mongoose'

const Schema = mongoose.Schema

export type SimulationPreciseType = {
  id: string
  actionChoices: Record<string, string>
  conference: Record<string, unknown>
  config: Record<string, unknown>
  date: Date
  enquête: Record<string, unknown>
  eventsSent: Record<string, unknown>
  foldedSteps: string[]
  hiddenNotifications: string[]
  persona: Record<string, unknown>
  ratings: {
    learned: string
    action: string
  }
  situation: Record<string, unknown>
  storedAmortissementAvion: Record<string, unknown>
  storedTrajets: Record<string, unknown>
  survey: Record<string, unknown>
  targetUnit: string
  unfoldedStep: string
  url: string
}

export const SimulationPreciseSchema = new Schema<SimulationPreciseType>(
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
