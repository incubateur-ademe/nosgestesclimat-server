const express = require('express')

const Group = require('../../schemas/GroupSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const { Simulation } = require('../../schemas/SimulationSchema')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  const _id = req.body._id
  const name = req.body.name
  const simulation = req.body.simulation
  const email = req.body.email

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

    groupFound.participants.push(simulationCreated._id)

    const groupSaved = await groupFound.save()

    setSuccessfulJSONResponse(res)

    res.json(groupSaved)

    console.log('New participant added to group: ', groupSaved.name)
  } catch (error) {
    return res.status(401).send('Error while adding participant.')
  }
})

module.exports = router
