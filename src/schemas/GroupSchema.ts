import mongoose, { RefType } from 'mongoose'

import {
  SimulationPreciseSchema,
  SimulationPreciseType,
} from './_legacy/SimulationPreciseSchema'

const Schema = mongoose.Schema

type Participant = {
  _id?: string
  name: string
  email: string
  userId: string
  simulation: RefType
}

type GroupType = {
  name: string
  emoji: string
  administrator: Participant
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

/*
 ** Legacy from previous version
 */
const OwnerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
  },
  userId: {
    type: String,
    required: false,
  },
})
const MemberSchema = new Schema({
  email: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  simulation: SimulationPreciseSchema,
  userId: {
    type: String,
    required: true,
  },
})
/*
 ** Legacy from previous version
 */

const ParticipantSchema = new Schema<Participant>({
  name: {
    type: String,
    required: true,
  },
  email: String,
  userId: String,
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
      email: {
        type: String,
        required: false,
      },
      userId: String,
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
