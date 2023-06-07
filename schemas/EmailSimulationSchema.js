const mongoose = require('mongoose')

const Schema = mongoose.Schema

const EmailSimulationSchema = new Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: true,
      auto: true
    },
    data: Object
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('EmailSimulation', EmailSimulationSchema)
