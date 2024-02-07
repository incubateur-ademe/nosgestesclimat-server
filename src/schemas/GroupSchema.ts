import mongoose, { RefType } from 'mongoose'

import { SimulationPreciseType } from './_legacy/SimulationPreciseSchema'
import { MemberSchema, OwnerSchema } from './_legacy/GroupSubSchemas'

const Schema = mongoose.Schema

type Participant = {
  _id?: string
  name: string
  email?: string
  userId: string
  // Conditional because a participant can be added without a simulation
  simulation?: RefType
}

type GroupType = {
  name: string
  emoji: string
  administrator: {
    name: string
    email?: String
    userId: String
  }
  participants: Participant[]
  // Legacy from previous version
  // We should remove it before going to production
  owner: {
    name: string
    email: string
    userId: string
  }
  members: {
    name: string
    email: string
    userId: string
    simulation: SimulationPreciseType
  }[]
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
    // Legacy from previous version
    // We should remove it before going to production
    owner: OwnerSchema,
    members: [MemberSchema],
  },
  {
    timestamps: true,
  }
)

export const Group = mongoose.model('Group', GroupSchema)
