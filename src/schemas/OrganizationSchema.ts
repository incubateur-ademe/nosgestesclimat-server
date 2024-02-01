import mongoose, { RefType } from 'mongoose'
import {
  VerificationCodeSchema,
  VerificationCodeType,
} from './VerificationCodeSchema'

const Schema = mongoose.Schema

type Administrator = {
  name: string
  email: string
  telephone: string
  position: string
  verificationCode: VerificationCodeType
}

type Poll = {
  simulations: RefType[]
  startDate: Date
  endDate: Date
  name: string
  additionalQuestions: string[]
  expectedNumberOfParticipants: number
}

type OrganizationType = {
  administrators: Administrator[]
  polls: Poll[]
  name: string
  slug: string
}

const AdministratorSchema = new Schema<Administrator>(
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

const PollSchema = new Schema<Poll>(
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

export const OrganizationSchema = new Schema<OrganizationType>(
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

export const Organization = mongoose.model('Organization', OrganizationSchema)
