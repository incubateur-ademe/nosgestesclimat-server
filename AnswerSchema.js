const mongoose = require('mongoose')
const Schema = mongoose.Schema
const AnswerSchema = new Schema(
  {
    data: {
      total: Number,
      progress: Number,
      byCategory: {
        type: Map,
        of: Number,
      },
    },
    survey: String,
    id: String,
  },
  {
    timestamps: true,
  }
)

let Chat = mongoose.model('Answer', AnswerSchema)
module.exports = Chat
