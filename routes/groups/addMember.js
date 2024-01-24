const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const getUserDocument = require('../../helpers/queries/getUserDocument')
const { Simulation } = require('../../schemas/SimulationSchema')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const _id = req.body._id
  const name = req.body.name
  const simulation = req.body.simulation
  const userId = req.body.userId
  const email = req.body.email

  if (!_id) {
    return res.status(401).send('No group id provided.')
  }

  if (!userId && !email) {
    return res.status(401).send('No user id or email provided.')
  }

  try {
    const groupFound = await Group.findById(_id)

    if (!groupFound) {
      return res.status(404).send('Group not found.')
    }

    const user = getUserDocument({
      name,
      email,
      userId,
    })

    const simulationCreated = new Simulation({
      userId: user._id,
      actionChoices: simulation.actionChoices,
      config: simulation.config,
      date: simulation.date,
      foldedSteps: simulation.foldedSteps,
      hiddenNotifications: simulation.hiddenNotifications,
      situation: simulation.situation,
      unfoldedStep: simulation.unfoldedStep,
      computedResults: simulation.computedResults,
    })

    const participantAdded = {
      name,
      simulation: simulationCreated._id,
    }

    groupFound.participants.push(participantAdded)

    const groupSaved = await groupFound.save()

    setSuccessfulJSONResponse(res)

    res.json(groupSaved)

    console.log('New member added to group: ', groupSaved.name)
  } catch (error) {
    return res.status(401).send('Error while adding participant.')
  }
})

module.exports = router
