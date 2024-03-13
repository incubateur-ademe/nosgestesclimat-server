const mongoose = require('mongoose')

const Schema = mongoose.Schema

const EmailSimulationSchema = new Schema(
  {
    data: Object
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('EmailSimulation', EmailSimulationSchema)
