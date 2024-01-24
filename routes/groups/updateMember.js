const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const { Simulation } = require('../../schemas/SimulationSchema')

const router = express.Router()

// Update results and simulation
router.route('/').post(async (req, res, next) => {
  const _id = req.body._id
  const simulation = req.body.simulation
  const userId = req.body.userId
  const email = req.body.email

  if (!_id) {
    return res.status(401).send('No group id provided.')
  }

  if (!userId && !email) {
    return res.status(401).send('No user id or email provided.')
  }

  if (!simulation) {
    return res.status(401).send('No simulation provided.')
  }

  try {
    const groupFound = await Group.findById(_id)
      .populate('participants.simulation')
      .populate('participants.simulation.user')

    const simulationId = groupFound.participants.find(
      (participant) => participant.simulation.userId === userId
    )?.simulation?._id

    if (!simulationId) {
      return res.status(401).send('No participant found matching this user id.')
    }

    const simulationFound = await Simulation.findById(simulationId)

    if (!simulationFound) {
      return res.status(404).send('Simulation not found.')
    }

    simulationFound.computedResults = simulation.computedResults
    simulationFound.unfoldedStep = simulation.unfoldedStep
    simulationFound.foldedSteps = simulation.foldedSteps
    simulationFound.hiddenNotifications = simulation.hiddenNotifications
    simulationFound.actionChoices = simulation.actionChoices
    simulationFound.situation = simulation.situation

    await simulationFound.save()

    setSuccessfulJSONResponse(res)

    const groupUpdated = await Group.findById(_id)
      .populate('administrator')
      .populate('participants.simulation')
      .populate('participants.simulation.user')

    res.json(groupUpdated)

    console.log('Member updated.')
  } catch (error) {
    res.status(501).send(error)
  }
})

module.exports = router
