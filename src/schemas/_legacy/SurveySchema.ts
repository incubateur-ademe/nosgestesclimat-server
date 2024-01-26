import mongoose from 'mongoose'

const Schema = mongoose.Schema

const SurveySchema = new Schema(
  {
    name: String,
    id: String,
    contextFile: String,
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('Survey', SurveySchema)
