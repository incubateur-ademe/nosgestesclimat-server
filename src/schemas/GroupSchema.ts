import mongoose, { RefType } from 'mongoose'

import { SimulationPreciseType } from './_legacy/SimulationPreciseSchema'
import { MemberSchema, OwnerSchema } from './_legacy/GroupSubSchemas'

const Schema = mongoose.Schema

type Participant = {
  name: string
  email?: string
  userId: string
  simulation: RefType
}

export type GroupType = {
  name: string
  emoji: string
  administrator: {
    name: string
    email?: String
    userId: String
  }
  participants: Participant[]
}

const ParticipantSchema = new Schema<Participant>({
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

export const GroupSchema = new Schema<GroupType>(
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
  },
  {
    timestamps: true,
  }
)

export const Group = mongoose.model('Group', GroupSchema)
