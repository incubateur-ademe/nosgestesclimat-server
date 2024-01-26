const express = require('express')

const { Group } = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const { Simulation } = require('../../schemas/SimulationSchema')
const getUserDocument = require('../../helpers/queries/getUserDocument')

const router = express.Router()

router.route('/').post(async (req, res) => {
  const _id = req.body._id
  const name = req.body.name
  const simulation = req.body.simulation
  const email = req.body.email
  const userId = req.body.userId

  if (!_id) {
    return res.status(401).send('No group id provided.')
  }

  if (!name) {
    return res.status(401).send('No participant name provided.')
  }

  if (!simulation) {
    return res.status(401).send('No simulation provided.')
  }

  try {
    const groupFound = await Group.findById(_id)

    if (!groupFound) {
      return res.status(404).send('Group not found.')
    }

    // Get user document or create a new one
    const userDocument = getUserDocument({
      email,
      name,
      userId,
    })

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

    const simulationSaved = await simulationCreated.save()

    groupFound.participants.push({
      name,
      email,
      userId,
      simulation: simulationSaved._id,
    })

    const groupSaved = await groupFound.save()

    setSuccessfulJSONResponse(res)

    res.json(groupSaved)

    console.log('New participant added to group: ', groupSaved.name)
  } catch (error) {
    return res.status(401).send('Error while adding participant.')
  }
})

module.exports = router
