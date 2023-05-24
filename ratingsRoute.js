const express = require('express')
const bodyParser = require('body-parser')
const connectdb = require('./database')
const Simulation = require('./SimulationSchema')

const router = express.Router()

router.route('/').get((req, res, next) => {
  connectdb.then((db) => {
    let data = Simulation.find({})
    data.then((simulations) => {
      if (!simulations.length) {
        return res.status(404).send('No ratings found')
      }
      const ratings = simulations.map((d) => d.ratings)
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(ratings)
    })
  })
})

module.exports = router
