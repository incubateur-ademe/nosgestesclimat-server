import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import connect from './src/helpers/db/initDatabase'

let mongod: MongoMemoryServer | undefined

beforeAll(async () => {
  const mongoUrl = new URL(process.env.MONGO_URL || '')

  mongod = await MongoMemoryServer.create({
    instance: {
      port: +mongoUrl.port,
    },
    binary: {
      // version: '4.0.3', // Should be activated
    },
  })

  await connect()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod?.stop()
})