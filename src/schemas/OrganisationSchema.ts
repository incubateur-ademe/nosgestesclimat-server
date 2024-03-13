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
  userId: string
}

export type OrganisationType = {
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
    userId: String,
  },
  {
    timestamps: true,
  }
)

export const OrganisationSchema = new Schema<OrganisationType>(
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

export const Organisation = mongoose.model('Organisation', OrganisationSchema)