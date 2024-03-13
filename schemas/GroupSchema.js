const mongoose = require('mongoose')
const { SimulationPreciseSchema } = require('./SimulationPreciseSchema')
const Schema = mongoose.Schema

const OwnerSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false
  },
  userId: {
    type: String,
    required: true
  }
})

const MemberSchema = new Schema({
  email: {
    type: String,
    required: false
  },
  name: {
    type: String,
    required: true
  },
  simulation: SimulationPreciseSchema,
  userId: {
    type: String,
    required: true
  },
  results: {
    total: String,
    transports: String,
    alimentation: String,
    logement: String,
    'services sociétaux': String,
    divers: String
  }
})

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    owner: OwnerSchema,
    members: [MemberSchema]
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Group', GroupSchema)
