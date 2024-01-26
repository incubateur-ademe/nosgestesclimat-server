const mongoose = require('mongoose')

const { SimulationPreciseSchema } = require('./_legacy/SimulationPreciseSchema')

const Schema = mongoose.Schema

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

const ParticipantSchema = new Schema({
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

const GroupSchema = new Schema(
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

module.exports = {
  Group: mongoose.model('Group', GroupSchema),
  GroupSchema,
}
