const mongoose = require('mongoose')
const { VerificationCodeSchema } = require('./VerificationCodeSchema')

const Schema = mongoose.Schema

const AdministratorSchema = new Schema(
  {
    name: String,
    email: String,
    telephone: String,
    position: String,
    verificationCode: VerificationCodeSchema,
  },
  {
    timestamps: true,
  }
)

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
    administrators: [AdministratorSchema],
    polls: [PollSchema],
    name: String,
    slug: String,
  },
  {
    timestamps: true,
  }
)

module.exports = {
  Organization: mongoose.model('Organization', OrganizationSchema),
  OrganizationSchema,
}
