const express = require('express')
const connectdb = require('../scripts/initDatabase')
const mongoose = require('mongoose')
const SimulationSchema = require('../schemas/SimulationSchema')
const router = express.Router()

router.route('/:id?').get((req, res, next) => {
  if (req.params.id == null) {
    return res.status(404).send('You must provide a simulation id')
  }

  let objectId
  try {
    objectId = mongoose.Types.ObjectId(req.params.id)
  } catch (error) {
    return res.status(404).send('This id is not valid')
  }

  connectdb.then(async () => {
    const simulation = await SimulationSchema.findOne({
      _id: objectId,
    })

    if (!simulation) {
      return res.status(404).send('This simulation does not exist')
    }
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(simulation)
  })
})

module.exports = router
