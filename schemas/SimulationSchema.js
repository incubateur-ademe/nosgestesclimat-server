const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SimulationSchema = new Schema(
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
        services: Number,
      },
    },
  },
  {
    timestamps: true,
  }
)

module.exports = {
  SimulationSchema,
  Simulation: mongoose.model('Simulation', SimulationSchema),
}
