import mongoose from 'mongoose'
import { VerificationCodeSchema } from './VerificationCodeSchema'
import type { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

export type OrganisationType = FullInferSchemaType<typeof OrganisationSchema>

const AdministratorSchema = new Schema(
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

export const OrganisationSchema = new Schema(
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
