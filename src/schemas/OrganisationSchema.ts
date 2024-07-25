import mongoose, { type InferSchemaType } from 'mongoose'
import type { FullInferSchemaType } from '../types/types'
import { VerificationCodeSchema } from './VerificationCodeSchema'

const Schema = mongoose.Schema

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

export type AdministratorType = InferSchemaType<typeof AdministratorSchema>

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

export type OrganisationType = FullInferSchemaType<typeof OrganisationSchema>

export const Organisation = mongoose.model('Organisation', OrganisationSchema)
