const mongoose = require('mongoose')
const { SimulationPreciseSchema } = require('./SimulationPreciseSchema')
const Schema = mongoose.Schema

const OwnerSchema = new Schema({
  name: String,
  email: {
    type: String,
    required: true,
  },
  position: String,
  telephone: String,
})

const PollSchema = new Schema({
  simulations: [SimulationPreciseSchema],
  startDate: Date,
  endDate: Date,
  name: String,
  additionalQuestions: [String],
  numberOfParticipants: Number,
})

const OrganizationSchema = new Schema(
  {
    owner: OwnerSchema,
    polls: [PollSchema],
    name: String,
    lastModifiedDate: Date,
    verificationCode: {
      code: {
        type: String,
        length: 6,
      },
      expirationDate: Date,
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Organization', OrganizationSchema)
