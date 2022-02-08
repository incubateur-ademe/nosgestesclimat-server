const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const url = process.env.SCALINGO_MONGO_URL || 'mongodb://localhost:27017/survey'
const connect = mongoose.connect(url, { useNewUrlParser: true })
module.exports = connect
