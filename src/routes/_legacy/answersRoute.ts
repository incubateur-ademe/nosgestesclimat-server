import express from 'express'
import connectdb from '../../helpers/db/initDatabase'
import Answers from '../../schemas/_legacy/AnswerSchema'
import Surveys from '../../schemas/_legacy/SurveySchema'

import { Parser } from 'json2csv'
import fs from 'fs'
import yaml from 'yaml'

const router = express.Router()

const getCsvHeader = async (roomName: string) => {
  const defaultCsvHeader = [
    'alimentation',
    'transport',
    'logement',
    'divers',
    'services sociétaux',
    'total',
    'progress',
  ]

  const survey = await Surveys.find({ name: roomName })
  const contextFileName = survey[0]['contextFile']
  if (!contextFileName) {
    return defaultCsvHeader
  } else {
    const data = fs.readFileSync(
      `./contextes-sondage/${contextFileName}.yaml`,
      'utf8'
    )
    const rules = Object.keys(yaml.parse(data))
    const contextHeaders = [
      ...new Set(
        rules.reduce((res, rule) => {
          const header = rule.split(' . ')[1]
          header && res.push(header as never)
          return res
        }, [])
      ),
    ]
    return contextHeaders.concat(defaultCsvHeader as never[])
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
    const data = Answers.find({ survey: roomName })
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
          // @ts-ignore
          const parser = new Parser({ csvHeader })
          const json = answers.map((answer) =>
            Object.fromEntries(
              csvHeader.map((field) => {
                // @ts-ignore
                return answer.data[field]
                  ? // @ts-ignore
                    [field, answer.data[field]]
                  : // @ts-ignore
                  answer.data.byCategory.get(field)
                  ? // @ts-ignore
                    [field, answer.data.byCategory.get(field)]
                  : // @ts-ignore
                  answer.data.context && answer.data.context.get(field) // we take into account old answers with no context and answers with empty context in case of undefined get resultfor the two firts conditions
                  ? // @ts-ignore
                    [field, answer.data.context.get(field)]
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

export default router
