import express from 'express'
import connectdb from '../../helpers/db/initDatabase'
import Survey from '../../schemas/_legacy/SurveySchema'

const router = express.Router()

router.route('/:room').get((req, res) => {
  if (req.params.room == null) {
    throw new Error('Unauthorized. A valid survey name must be provided')
  }

  connectdb().then(() => {
    const data = Survey.find({ name: req.params.room })
    // @ts-ignore
    data.then((survey) => {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(survey)
    })
  })
})

router.route('/').post(async (req, res, next) => {
  if (req.body.room == null) {
    return next('Error. A survey name must be provided')
  }

  const found = await Survey.find({ name: req.body.room })
  if (found.length) {
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 409
    res.json(found[0])

    console.log('Survey exists', req.body.room)
    return
  }

  const survey = new Survey({ name: req.body.room })
  survey.save((error) => {
    if (error) {
      res.send(error)
    }

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(survey)

    console.log('New survey create', req.body.room)
  })
})

export default router
