import mongoose from 'mongoose'
import type { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

export const NorthstarRatingSchema = new Schema(
  {
    simulationId: String,
    value: String,
    type: String,
  },
  {
    timestamps: true,
  }
)

export type NorthstarRatingType = FullInferSchemaType<
  typeof NorthstarRatingSchema
>

export const NorthstarRating = mongoose.model(
  'NorthstarRating',
  NorthstarRatingSchema
)
