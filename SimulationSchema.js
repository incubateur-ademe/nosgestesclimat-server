const mongoose = require('mongoose')
const Schema = mongoose.Schema
const SimulationSchema = new Schema(
  {
    id: String,
    data: Object, //TODO temporary format just to try a v0. Should be specified in a v2 ? Or let loose ?
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Simulation', SimulationSchema)
