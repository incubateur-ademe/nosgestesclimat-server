const mongoose = require('mongoose')
const Group = require('../schemas/GroupSchema')

mongoose.Promise = require('bluebird')

const url = process.env.SCALINGO_MONGO_URL || 'mongodb://127.0.0.1:27017/survey'

const connect = mongoose.connect(url, { useNewUrlParser: true })

connect.then(async (db) => {
  const result = await Group.find({ 'owner.name': { $eq: 'Jean-Marc' } })
  console.log(result?.length)

  await Group.deleteMany({ 'owner.name': { $eq: 'Jean-Marc' } })

  db.disconnect()
})
