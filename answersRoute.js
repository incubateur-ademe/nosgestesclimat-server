const express = require('express')
const bodyParser = require('body-parser')
const connectdb = require('./database')
const Answers = require('./AnswerSchema')

const { Parser } = require('json2csv')
const fields = ['byCategory', 'total', 'progress']
const parser = new Parser({ fields })

const router = express.Router()

router.route('/:room').get((req, res, next) => {
  if (req.params.room == null) {
    throw new Error('Unauthorized. A valid survey name must be provided')
  }

  const csv = req.query.format === 'csv'

  connectdb.then((db) => {
    let data = Answers.find({ survey: req.params.room })
    data.then((answers) => {
      if (!csv) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.json(answers.map(({ data, id }) => ({ data, id })))
      } else {
        try {
          const json = answers.map((answer) =>
            Object.fromEntries(
              fields.map((field) => [field, answer.data[field]])
            )
          )
          const csv = parser.parse(json)
          res.attachment(`sondage-NGC-${req.params.room}.csv`).send(csv)
        } catch (err) {
          console.error('Error parsing JSON survey answers as CSV', err)
        }
      }
    })
  })
})

module.exports = router
