const mongoose = require('mongoose')

const Schema = mongoose.Schema

const UserSchema = new Schema(
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

module.exports = {
  UserModel: mongoose.model('User', UserSchema),
  UserSchema,
}
