import mongoose, { type InferSchemaType } from 'mongoose'
import type { FullInferSchemaType } from '../types/types'
import { MemberSchema, OwnerSchema } from './_legacy/GroupSubSchemas'

const Schema = mongoose.Schema

const ParticipantSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: String,
  userId: {
    type: String,
    required: true,
  },
  simulation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Simulation',
  },
})

export type ParticipantType = InferSchemaType<typeof ParticipantSchema>

export const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    administrator: {
      name: {
        type: String,
        required: true,
      },
      email: String,
      userId: {
        type: String,
        required: true,
      },
    },
    participants: [ParticipantSchema],
    // Legacy from previous version
    // We should remove it before going to production
    owner: OwnerSchema,
    members: [MemberSchema],
  },
  {
    timestamps: true,
  }
)

export type GroupType = FullInferSchemaType<typeof GroupSchema>

export const Group = mongoose.model('Group', GroupSchema)
