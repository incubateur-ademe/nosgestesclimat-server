const mongoose = require('mongoose')

const Schema = mongoose.Schema

const VerificationCodeSchema = new Schema(
  {
    code: {
      type: String,
      length: 6,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

module.exports = {
  VerificationCodeModel: mongoose.model(
    'VerificationCode',
    VerificationCodeSchema
  ),
  VerificationCodeSchema,
}
