const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const { Simulation } = require('../../schemas/SimulationSchema')

const router = express.Router()

// Update results and simulation
router.route('/').post(async (req, res) => {
  const _id = req.body._id
  const simulation = req.body.simulation
  const userId = req.body.userId
  const email = req.body.email

  if (!_id) {
    return res.status(401).send('No group id provided.')
  }

  if (!simulation) {
    return res.status(401).send('No simulation provided.')
  }

  if (!userId && !email) {
    return res
      .status(401)
      .send('Error : an email or a userId must be provided.')
  }

  try {
    const groupFound = await Group.findOne({
      _id,
      $or: [
        {
          'participants.userId': userId,
        },
        {
          'participants.email': email,
        },
      ],
    })

    const participant = groupFound.participants.find(
      (participant) =>
        participant.userId === userId || participant.email === email
    )

    const simulationId = participant.simulation

    const simulationFound = await Simulation.findById(simulationId)

    if (!simulationFound) {
      return res.status(404).send('Simulation not found.')
    }

    simulationFound.computedResults = simulation.computedResults
    simulationFound.foldedSteps = simulation.foldedSteps
    simulationFound.actionChoices = simulation.actionChoices
    simulationFound.situation = simulation.situation
    simulationFound.progression = simulation.progression

    await simulationFound.save()

    setSuccessfulJSONResponse(res)

    const groupUpdated = await Group.findById(_id).populate(
      'participants.simulation'
    )

    res.json(groupUpdated)

    console.log('Participant simulation updated.')
  } catch (error) {
    res.status(501).send(error)
  }
})

module.exports = router
