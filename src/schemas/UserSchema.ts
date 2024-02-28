import mongoose, { RefType } from 'mongoose'

const Schema = mongoose.Schema

export type UserType = {
  name: string
  email?: string
  userId: string
  position?: string
  telephone?: string
}

export const UserSchema = new Schema<UserType>(
  {
    name: String,
    email: String,
    userId: {
      type: String,
      unique: true,
    },
    position: String,
    telephone: String,
  },
  { timestamps: true }
)

export const User = mongoose.model('User', UserSchema)
