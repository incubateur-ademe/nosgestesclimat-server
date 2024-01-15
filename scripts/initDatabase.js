const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')

const url =
  process.env.SCALINGO_MONGO_URL || 'mongodb://127.0.0.1:27017/nosgestesclimat'

const connect = mongoose.connect(url, { useNewUrlParser: true })

module.exports = connect
