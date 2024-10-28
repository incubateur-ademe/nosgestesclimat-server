import BluebirdPromise from 'bluebird'
import mongoose from 'mongoose'
import { Group } from '../src/schemas/GroupSchema'

mongoose.Promise = BluebirdPromise

const url = process.env.SCALINGO_MONGO_URL || 'mongodb://127.0.0.1:27017/survey'

const connect = mongoose.connect(url)

connect.then(async (db) => {
  const result = await Group.find({ 'owner.name': { $eq: 'Jean-Marc' } })
  console.log(result?.length)

  await Group.deleteMany({ 'owner.name': { $eq: 'Jean-Marc' } })

  db.disconnect()
})
