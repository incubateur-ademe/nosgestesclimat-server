import mongoose from 'mongoose'

const Schema = mongoose.Schema

export type VerificationCodeType = {
  code: string
  expirationDate: Date
  email: string
}

export const VerificationCodeSchema = new Schema<VerificationCodeType>(
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

export const VerificationCode = mongoose.model(
  'VerificationCode',
  VerificationCodeSchema
)
