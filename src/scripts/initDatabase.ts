import mongoose from 'mongoose'
import { config } from '../config'

mongoose.set('strictQuery', false)

export default mongoose.connect(config.mongo.url)
