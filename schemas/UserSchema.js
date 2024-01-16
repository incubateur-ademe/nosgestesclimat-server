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
    hasOptedInForCommunications: Boolean,
  },
  { timestamps: true }
)

module.exports = {
  UserModel: mongoose.model('User', UserSchema),
  UserSchema,
}
