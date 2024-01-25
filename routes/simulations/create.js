const express = require('express')

const Simulation = require('../../schemas/SimulationSchema')

const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulation = req.body.simulation
  const name = req.body.name
  const email = req.body.email

  if (!simulation) {
    return res.status(404).send('Error. A simulation must be provided.')
  }

  try {
    const simulationCreated = new Simulation({
      id: simulation.id,
      email,
      name,
      actionChoices: simulation.actionChoices,
      date: simulation.date,
      foldedSteps: simulation.foldedSteps,
      situation: simulation.situation,
      computedResults: simulation.computedResults,
      progression: simulation.progression,
    })

    const simulationSaved = simulationCreated.save()

    setSuccessfulJSONResponse(res)

    res.json(simulationSaved)

    console.log('New simulation created.')
  } catch (error) {
    return res.status(401).send('Error while creating simulation.')
  }
})

module.exports = router
