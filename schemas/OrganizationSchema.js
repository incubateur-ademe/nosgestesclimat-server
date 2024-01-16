const mongoose = require('mongoose')
const { SimulationPreciseSchema } = require('./SimulationPreciseSchema')

const Schema = mongoose.Schema

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
    owner: {
      // Needed to query the organization when the owner logs in
      email: String,
      // Needed to link the organisator to the organization
      user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
      },
    },
    polls: [PollSchema],
    name: String,
    slug: String,
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
