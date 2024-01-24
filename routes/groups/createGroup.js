const express = require('express')
const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const getUserDocument = require('../../helpers/queries/getUserDocument')
const { Simulation } = require('../../schemas/SimulationSchema')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupName = req.body.name
  const groupEmoji = req.body.emoji
  const ownerName = req.body.ownerName
  const ownerEmail = req.body.ownerEmail
  const simulation = req.body.simulation
  const userId = req.body.userId

  if (groupName == null) {
    return res.status(404).send('Error. A group name must be provided.')
  }

  try {
    // Get user document or create a new one
    const userDocument = getUserDocument({
      ownerEmail,
      ownerName,
      userId,
    })

    const simulationCreated = new Simulation({
      userId: userDocument._id,
      actionChoices: simulation.actionChoices,
      config: simulation.config,
      date: simulation.date,
      foldedSteps: simulation.foldedSteps,
      hiddenNotifications: simulation.hiddenNotifications,
      situation: simulation.situation,
      unfoldedStep: simulation.unfoldedStep,
      computedResults: simulation.computedResults,
    })

    // Create a new Simulation document but what happens if the user already has one?
    // this brings up the risk of creating duplicate simulations
    const groupCreated = new Group({
      name: groupName,
      emoji: groupEmoji,
      administrator: userDocument._id,
      participants: [
        {
          name: ownerName,
          simulation: simulationCreated._id,
        },
      ],
    })

    const groupSaved = groupCreated.save()

    setSuccessfulJSONResponse(res)
    res.json(groupSaved)

    console.log('New group created: ', groupName)
  } catch (error) {
    return res.status(401).send('Error while creating group.')
  }
})

module.exports = router
