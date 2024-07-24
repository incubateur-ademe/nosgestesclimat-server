import mongoose from 'mongoose'
import type { FullInferSchemaType } from '../types/types'

const Schema = mongoose.Schema

export const UserSchema = new Schema(
  {
    name: String,
    email: String,
    userId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
)

export type UserType = FullInferSchemaType<typeof UserSchema>

export const User = mongoose.model('User', UserSchema)
