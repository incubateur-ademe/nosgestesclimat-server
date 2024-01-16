const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SimulationPreciseSchema = new Schema(
  {
    id: String,
    actionChoices: Object,
    config: Object,
    date: {
      type: Date,
      required: true,
    },
    foldedSteps: [String],
    hiddenNotifications: [String],
    persona: Object,
    situation: Object,
    unfoldedStep: String,
    url: String,
    // Added by @bjlaa to store en dur les résultats de la simulation
    computedResults: {
      bilan: Number,
      categories: {
        transport: Number,
        logement: Number,
        alimentation: Number,
        divers: Number,
        services: Number,
      },
    },
    // Northstar rating
    ratings: {
      learned: String,
      action: String,
    },
    // Legacy
    conference: Object,
    enquête: Object,
    eventsSent: Object,
    storedAmortissementAvion: Object,
    storedTrajets: Object,
    survey: Object,
    targetUnit: String,
  },
  {
    timestamps: true,
  }
)

module.exports = {
  SimulationPreciseModel: mongoose.model(
    'SimulationPrecise',
    SimulationPreciseSchema
  ),
  SimulationPreciseSchema,
}
