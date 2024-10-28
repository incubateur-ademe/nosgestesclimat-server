import mongoose from 'mongoose'

const Schema = mongoose.Schema

const EmailSimulationSchema = new Schema(
  {
    data: Object,
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('EmailSimulation', EmailSimulationSchema)
