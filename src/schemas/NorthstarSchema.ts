import mongoose from 'mongoose'

const Schema = mongoose.Schema

export type NorthstarRatingType = {
  simulationId: string
  value: string
  type: string
}

export const NorthstarRatingSchema = new Schema<NorthstarRatingType>(
  {
    simulationId: String,
    value: String,
    type: String,
  },
  {
    timestamps: true,
  }
)

export const NorthstarRating = mongoose.model(
  'NorthstarRating',
  NorthstarRatingSchema
)
