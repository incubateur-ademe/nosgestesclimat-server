const express = require('express')
const { Simulation } = require('../../schemas/SimulationSchema')
const getUserDocument = require('../../helpers/queries/getUserDocument')
const sendSavedSimulation = require('../../helpers/email/sendSavedSimulation')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res) => {
  const email = req.body.email
  const shareURL = req.body.shareURL
  const attributes = req.body.attributes

  try {
    const user = getUserDocument({
      email,
      name: '',
    })

    const newSimulation = new Simulation({
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

    const simulationSaved = await newSimulation.save()

    setSuccessfulJSONResponse(res)

    res.json(simulationSaved.toObject()._id)
  } catch (error) {
    return res.status(401).send('Error while saving simulation.')
  }
})

module.exports = router
