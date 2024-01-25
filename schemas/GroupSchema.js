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
      ref: 'Simulation',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulation',
      },
    ],
    // Legacy from previous version
    // We should remove it before going to production
    owner: OwnerSchema,
    members: [MemberSchema],
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Group', GroupSchema)
