const express = require('express')
const bodyParser = require('body-parser')
const connectdb = require('./database')
const Simulation = require('./SimulationSchema')

const router = express.Router()

router.route('/:id').get((req, res, next) => {
  if (req.params.id == null) {
    res.status(404).send('Simulation not found')
  }

  connectdb.then((db) => {
    let data = Simulation.find({ name: req.params.id })
    data.then((simulation) => {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(simulation)
    })
  })
})

// This POST route creates or updates a property. It's a backup API.
router.route('/').post(async (req, res, next) => {
  if (req.body.id == null) {
    return next('Error. A simulation id must be provided')
  }

  const db = connectdb

  const found = await Simulation.find({ name: req.body.id })

  const simulation = found.length
    ? found[0]
    : new Simulation({ name: req.body.id })

  simulation.save((error) => {
    if (error) {
      res.send(error)
    }

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(simulation)

    console.log('Simulation updated', req.body.id)
  })
})

module.exports = router
