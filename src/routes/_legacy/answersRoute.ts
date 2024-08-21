import express from 'express'
import fs from 'fs'
import { Parser } from 'json2csv'
import yaml from 'yaml'
import connectdb from '../../helpers/db/initDatabase'
import Answers from '../../schemas/_legacy/AnswerSchema'
import Surveys from '../../schemas/_legacy/SurveySchema'

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
        rules.reduce((res: string[], rule) => {
          const header = rule.split(' . ')[1]
          if (header) {
            res.push(header)
          }
          return res
        }, [])
      ),
    ]
    return contextHeaders.concat(defaultCsvHeader)
  }
}

router.route('/:room').get((req, res) => {
  const roomName = req.params.room

  if (roomName == null) {
    throw new Error('Unauthorized. A valid survey name must be provided')
  }

  // Depending on the request, we serve JSON (designed for nosgestesclimat.fr) or CSV (to be opened by a LibreOffice or similar)
  const csv = req.query.format === 'csv'

  connectdb().then(() => {
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
          // @ts-expect-error 2561 bad typings or deprecated API => json2csv is obsolete though
          const parser = new Parser({ csvHeader })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json = answers.map((answer: any) =>
            Object.fromEntries(
              csvHeader.map((field) => {
                return answer.data[field]
                  ? [field, answer.data[field]]
                  : answer.data.byCategory.get(field)
                    ? [field, answer.data.byCategory.get(field)]
                    : answer.data.context && answer.data.context.get(field) // we take into account old answers with no context and answers with empty context in case of undefined get resultfor the two firts conditions
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

export default router
