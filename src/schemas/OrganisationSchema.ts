import mongoose, { RefType } from 'mongoose'
import {
  VerificationCodeSchema,
  VerificationCodeType,
} from './VerificationCodeSchema'
import { PollType } from './PollSchema'

const Schema = mongoose.Schema

type Administrator = {
  _id: string
  name: string
  email: string
  telephone: string
  position: string
  verificationCode: VerificationCodeType
  hasOptedInForCommunications: boolean
  userId: string
}

export type OrganisationType = {
  _id: string
  administrators: Administrator[]
  polls: RefType[]
  name: string
  slug: string
  organisationType: string
  numberOfCollaborators?: number
}

const AdministratorSchema = new Schema<Administrator>(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
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
    organisationType: String,
    numberOfCollaborators: Number,
  },
  {
    timestamps: true,
  }
)

export const Organisation = mongoose.model('Organisation', OrganisationSchema)
