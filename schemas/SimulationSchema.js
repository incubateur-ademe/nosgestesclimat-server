const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SimulationSchema = new Schema(
  {
    // This is the id created by the client !== _id
    id: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actionChoices: Object,
    config: Object,
    date: {
      type: Date,
      required: true,
    },
    foldedSteps: [String],
    hiddenNotifications: [String],
    situation: Object,
    unfoldedStep: String,

    // Northstar rating
    ratings: {
      learned: String,
      action: String,
    },
    // Legacy
    bilan: Number,
    categories: {
      transports: Number,
      logement: Number,
      alimentation: Number,
      divers: Number,
      services: Number,
    },
    conference: Object,
    enquête: Object,
    eventsSent: Object,
    storedAmortissementAvion: Object,
    storedTrajets: Object,
    survey: Object,
    targetUnit: String,
    // Needed to be compatible with the old API
    data: Object,
  },
  {
    timestamps: true,
  }
)

module.exports = {
  SimulationSchema,
  Simulation: mongoose.model('Simulation', SimulationSchema),
}
