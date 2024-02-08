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
  hasOptedInForCommunications: boolean
}

export type Poll = {
  simulations: RefType[]
  startDate: Date
  endDate: Date
  name: string
  slug: string
  defaultAdditionalQuestions: string[]
  expectedNumberOfParticipants: number
}

export type OrganizationType = {
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
    hasOptedInForCommunications: Boolean,
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
    slug: String,
    defaultAdditionalQuestions: [String],
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
