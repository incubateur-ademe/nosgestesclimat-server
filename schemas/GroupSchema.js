const mongoose = require('mongoose')
const { SimulationPreciseSchema } = require('./SimulationPreciseSchema')
const Schema = mongoose.Schema

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
  results: {
    total: String,
    transports: String,
    alimentation: String,
    logement: String,
    'services sociétaux': String,
    divers: String,
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
    owner: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    members: [MemberSchema],
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Group', GroupSchema)
