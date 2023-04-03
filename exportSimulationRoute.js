const express = require('express')
const connectdb = require('./database')
const Simulation = require('./SimulationSchema')

const router = express.Router()

router.route('/:password').get((req, res, next) => {
  if (
    req.params.password == null ||
    req.params.password !== process.env.EXPORT_SIMULATIONS_PASSWORD
  ) {
    res.statusCode = 401
    return next('Error, not Authorized')
  }

  connectdb.then((db) => {
    let data = Simulation.find()
    data.then((simulations) => {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(simulations)
    })
  })
})
module.exports = router
