import mongoose from 'mongoose'
import { config } from '../config'

mongoose.set('strictQuery', false)

let connection: ReturnType<typeof mongoose.connect> | undefined

export default () => {
  if (connection) {
    return connection
  }

  return (connection = mongoose.connect(config.mongo.url))
}
