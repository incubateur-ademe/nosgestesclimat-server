const mongoose = require('mongoose')
const SimulationPreciseSchema = require('./SimulationPreciseSchema')
const Schema = mongoose.Schema

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
    required: true,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    participants: [
      {
        // Username for this specific group
        name: String,
        simulation: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Simulation',
        },
      },
    ],
    // Legacy from previous version
    // We should remove it in a few months perhaps or for groups not updated after a certain date
    owner: OwnerSchema,
    members: [MemberSchema],
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Group', GroupSchema)
