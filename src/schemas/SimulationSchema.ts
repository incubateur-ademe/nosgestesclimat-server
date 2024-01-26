import mongoose from 'mongoose'

const Schema = mongoose.Schema

export const SimulationSchema = new Schema(
  {
    // UI stored simulation id
    id: String,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actionChoices: Object,
    progression: Number,
    date: {
      type: Date,
      required: true,
    },
    foldedSteps: [String],
    situation: Object,
    computedResults: {
      bilan: Number,
      categories: {
        alimentation: Number,
        transport: Number,
        logement: Number,
        divers: Number,
        'services sociétaux': Number,
      },
    },
  },
  {
    timestamps: true,
  }
)

export const Simulation = mongoose.model('Simulation', SimulationSchema)
