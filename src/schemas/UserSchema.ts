import mongoose, { RefType } from 'mongoose'

const Schema = mongoose.Schema

type User = {
  name: string
  email: string
  userId: string
  position: string
  telephone: string
  simulations: RefType[]
  groups: RefType[]
  organizations: RefType[]
}

export const UserSchema = new Schema<User>(
  {
    name: String,
    email: {
      type: String,
      unique: true,
    },
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
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    organizations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
      },
    ],
  },
  { timestamps: true }
)

export const User = mongoose.model('User', UserSchema)
