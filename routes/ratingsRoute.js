const express = require('express')
const connectdb = require('../scripts/initDatabase')
const Simulation = require('../schemas/SimulationSchema')

const router = express.Router()

router.route('/').get((req, res, next) => {
  connectdb.then(() => {
    let data = Simulation.find({})
    data.then((simulations) => {
      if (!simulations.length) {
        return res.status(404).send('No ratings found')
      }
      const ratings = simulations
        .map(({ data, updatedAt, createdAt }) => ({
          ratings: data?.ratings,
          createdAt,
          updatedAt
        }))
        .filter((d) => d.ratings)
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(ratings)
    })
  })
})

module.exports = router
