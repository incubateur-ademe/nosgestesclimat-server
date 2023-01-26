const express = require('express')
const bodyParser = require('body-parser')
const connectdb = require('./database')
const Answers = require('./AnswerSchema')
const Surveys = require('./SurveySchema')

const { Parser } = require('json2csv')
const router = express.Router()

const fs = require('fs')
const yaml = require('yaml')

const getCsvHeader = async (roomName) => {
  const defaultCsvHeader = [
    'alimentation',
    'transport',
    'logement',
    'divers',
    'services sociétaux',
    'total',
    'progress',
  ]

  let survey = await Surveys.find({ name: roomName })
  const contextFileName = survey[0]['contextFile']
  if (!contextFileName) {
    return defaultCsvHeader
  } else {
    const data = fs.readFileSync(
      `./contextes-sondage/${contextFileName}.yaml`,
      'utf8'
    )
    let rules = Object.keys(yaml.parse(data))
    const contextHeaders = [
      ...new Set(
        rules.reduce((res, rule) => {
          const header = rule.split(' . ')[1]
          header && res.push(header)
          return res
        }, [])
      ),
    ]
    return contextHeaders.concat(defaultCsvHeader)
  }
}

router.route('/:room').get((req, res, next) => {
  const roomName = req.params.room

  if (roomName == null) {
    throw new Error('Unauthorized. A valid survey name must be provided')
  }

  // Depending on the request, we serve JSON (designed for nosgestesclimat.fr) or CSV (to be opened by a LibreOffice or similar)
  const csv = req.query.format === 'csv'

  connectdb.then((db) => {
    let data = Answers.find({ survey: roomName })
    data.then(async (answers) => {
      if (!csv) {
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.json(answers.map(({ data, id }) => ({ data, id })))
      } else {
        try {
          // Context data depend of each survey
          // Hence we build the data schema here based on configuration files stored on the disk

          const csvHeader = await getCsvHeader(roomName)
          const parser = new Parser({ csvHeader })
          const json = answers.map((answer) =>
            Object.fromEntries(
              csvHeader.map((field) => {
                return answer.data[field]
                  ? [field, answer.data[field]]
                  : answer.data.byCategory.get(field)
                  ? [field, answer.data.byCategory.get(field)]
                  : answer.data.context && answer.data.context.get(field) //we take into account old answers with no context and answers with empty context in case of undefined get resultfor the two firts conditions
                  ? [field, answer.data.context.get(field)]
                  : [field, undefined]
              })
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
