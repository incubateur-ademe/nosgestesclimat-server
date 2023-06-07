const express = require('express')
const bodyParser = require('body-parser')
const connectdb = require('../scripts/initDatabase')
const Survey = require('../schemas/SurveySchema')

const router = express.Router()

router.route('/:room').get((req, res, next) => {
  if (req.params.room == null) {
    throw new Error('Unauthorized. A valid survey name must be provided')
  }

  connectdb.then((db) => {
    let data = Survey.find({ name: req.params.room })
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

  const db = connectdb

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

module.exports = router
