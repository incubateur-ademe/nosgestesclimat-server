const mongoose = require('mongoose')
const Schema = mongoose.Schema
const SimulationSchema = new Schema(
  {
    name: String,
    id: String,
    data: Object, //TODO temporary format just to try a v0
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Simulation', SimulationSchema)
