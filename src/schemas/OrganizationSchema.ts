import mongoose, { RefType } from 'mongoose'
import {
  VerificationCodeSchema,
  VerificationCodeType,
} from './VerificationCodeSchema'
import { PollType } from './PollSchema'

const Schema = mongoose.Schema

type Administrator = {
  name: string
  email: string
  telephone: string
  position: string
  verificationCode: VerificationCodeType
  hasOptedInForCommunications: boolean
}

export type OrganizationType = {
  administrators: Administrator[]
  polls: PollType[]
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

export const OrganizationSchema = new Schema<OrganizationType>(
  {
    administrators: [AdministratorSchema],
    polls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
      },
    ],
    name: String,
    slug: String,
  },
  {
    timestamps: true,
  }
)

export const Organization = mongoose.model('Organization', OrganizationSchema)
