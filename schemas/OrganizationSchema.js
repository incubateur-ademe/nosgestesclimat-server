const mongoose = require('mongoose')

const Schema = mongoose.Schema

const PollSchema = new Schema(
  {
    simulations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulation',
      },
    ],
    startDate: Date,
    endDate: Date,
    name: String,
    additionalQuestions: [String],
    expectedNumberOfParticipants: Number,
  },
  {
    timestamps: true,
  }
)

const OrganizationSchema = new Schema(
  {
    administrator: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    polls: [PollSchema],
    name: String,
    slug: String,
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
