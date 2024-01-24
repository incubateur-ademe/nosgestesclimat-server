const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SimulationSchema = new Schema(
  {
    // UI stored simulation id
    id: String,
    // Users that leave their email see a User document created and linked to the simulation
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // UI stored user id, which is used to identify anonymous users (no email)
    userId: String,
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
    // Should this be better typed?
    // It leaves us free of adding any more data we want later on
    computedResults: Object,
  },
  {
    timestamps: true,
  }
)

module.exports = {
  SimulationSchema,
  Simulation: mongoose.model('Simulation', SimulationSchema),
}
