const express = require('express')
const mongoose = require('mongoose')
const { Simulation } = require('../../schemas/SimulationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const router = express.Router()

router.route('/:id?').get(async (req, res, next) => {
  if (req.params.id == null) {
    return res.status(404).send('You must provide a simulation id')
  }

  let objectId
  try {
    objectId = mongoose.Types.ObjectId(req.params.id)
  } catch (error) {
    return res.status(404).send('This id is not valid')
  }

  try {
    const simulation = await Simulation.findOne({
      _id: objectId,
    })

    if (!simulation) {
      return res.status(404).send('This simulation does not exist')
    }

    setSuccessfulJSONResponse(res)

    res.json(simulation)
  } catch (error) {
    return res.status(500).send('Error while fetching simulation')
  }
})

module.exports = router
