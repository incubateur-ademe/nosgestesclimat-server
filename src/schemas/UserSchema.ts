import mongoose, { RefType } from 'mongoose'

const Schema = mongoose.Schema

export type UserType = {
  name: string
  email?: string
  userId: string
  position?: string
  telephone?: string
  simulations?: RefType[]
  groups?: RefType[]
  organisations?: RefType[]
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
    simulations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulation',
      },
    ],
    organisations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organisation',
      },
    ],
  },
  { timestamps: true }
)

export const User = mongoose.model('User', UserSchema)
