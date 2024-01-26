const express = require('express')

const Simulation = require('../../schemas/SimulationSchema')

const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId

  if (!simulationId) {
    return res
      .status(404)
      .send('Error. A simulation id or an email must be provided.')
  }

  try {
    const simulationFound = Simulation.findOne({
      id: simulationId,
    })

    if (!simulationFound) {
      return res.status(404).send('No matching simulation found.')
    }

    setSuccessfulJSONResponse(res)

    res.json(simulationFound)

    console.log('New simulation created.')
  } catch (error) {
    return res.status(401).send('Error while creating simulation.')
  }
})

module.exports = router
