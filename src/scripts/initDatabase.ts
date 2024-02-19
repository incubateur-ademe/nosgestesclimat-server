import mongoose from 'mongoose'

const url =
  process.env.SCALINGO_MONGO_URL || 'mongodb://127.0.0.1:27017/nosgestesclimat'

mongoose.set('strictQuery', false)

export default mongoose.connect(url)
