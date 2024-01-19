const express = require('express')
const SimulationSchema = require('../schemas/SimulationSchema')
const getUserDocument = require('../../helpers/queries/getUserDocument')
const sendSavedSimulation = require('../../helpers/email/sendSavedSimulation')

const router = express.Router()

router.route('/').post(async (req, res) => {
  const email = req.body.email
  const shareURL = req.body.shareURL
  const attributes = req.body.attributes

  const user = getUserDocument({
    email,
    name: '',
  })

  const newSimulation = new SimulationSchema({
    ...req.body.data,
    user: user.toObject()._id,
  })

  sendSavedSimulation({
    email,
    simulationURL: `https://nosgestesclimat.fr/fin&sid=${encodeURIComponent(
      newSimulation.toObject()._id.toString()
    )}&mtm_campaign=retrouver-ma-simulation`,
    shareURL,
    attributes,
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
