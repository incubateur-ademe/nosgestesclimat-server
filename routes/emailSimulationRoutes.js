const express = require('express')
const connectdb = require('../scripts/initDatabase')
const EmailSimulation = require('../schemas/EmailSimulationSchema')
const mongoose = require('mongoose')
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
    const simulation = await EmailSimulation.findOne({
      _id: objectId
    })

    if (!simulation) {
      return res.status(404).send('This simulation does not exist')
    }
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(simulation)
  })
})

// This POST route creates a document in the EmailSimulation collection.
router.route('/').post(async (req, res) => {
  const newSimulation = new EmailSimulation({
    data: req.body.data
  })

  newSimulation.save((error) => {
    if (error) {
      return res.send(error)
    }

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(newSimulation.toObject()._id)
  })
})

module.exports = router
