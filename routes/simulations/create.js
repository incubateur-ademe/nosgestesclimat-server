const express = require('express')

const Simulation = require('../../schemas/SimulationSchema')

const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const getUserDocument = require('../../helpers/queries/getUserDocument')

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulation = req.body.simulation
  const name = req.body.name
  const email = req.body.email
  const userId = req.body.userId

  if (!simulation) {
    return res.status(404).send('Error. A simulation must be provided.')
  }

  // Get user document or create a new one
  const userDocument = getUserDocument({
    email,
    name,
    userId,
  })

  try {
    const simulationCreated = new Simulation({
      id: simulation.id,
      user: userDocument._id,
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
