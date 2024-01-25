const express = require('express')

const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const { Simulation } = require('../../schemas/SimulationSchema')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const groupName = req.body.name
  const groupEmoji = req.body.emoji
  const ownerName = req.body.ownerName
  const administratorEmail = req.body.administratorEmail
  const simulation = req.body.simulation

  if (!groupName) {
    return res.status(404).send('Error. A group name must be provided.')
  }

  if (!administratorEmail) {
    return res.status(404).send('Error. An email must be provided.')
  }

  try {
    const simulationCreated = new Simulation({
      id: simulation.id,
      email: administratorEmail,
      name: ownerName,
      actionChoices: simulation.actionChoices,
      date: simulation.date,
      foldedSteps: simulation.foldedSteps,
      situation: simulation.situation,
      computedResults: simulation.computedResults,
      progression: simulation.progression,
    })

    const simulationSaved = simulationCreated.save()

    // Create a new Simulation document but what happens if the user already has one?
    // this brings up the risk of creating duplicate simulations
    const groupCreated = new Group({
      name: groupName,
      emoji: groupEmoji,
      administrator: simulationSaved.toObject()._id,
      participants: [simulationSaved.toObject()._id],
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
