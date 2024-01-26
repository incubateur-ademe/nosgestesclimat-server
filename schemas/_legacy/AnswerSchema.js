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
      // context will be empty if there is no context related to the survey.
      context: {
        type: Map,
      },
    },
    survey: String,
    id: String,
  },
  {
    timestamps: true,
  }
)

const Chat = mongoose.model('Answer', AnswerSchema)

module.exports = Chat
