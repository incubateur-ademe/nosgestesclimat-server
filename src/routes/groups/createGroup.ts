import express from 'express'

import { Group } from '../../schemas/GroupSchema'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Simulation } from '../../schemas/SimulationSchema'

import { getUserDocument } from '../../helpers/queries/getUserDocument'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const groupName = req.body.name
  const groupEmoji = req.body.emoji
  const administratorName = req.body.administratorName
  const administratorEmail = req.body.administratorEmail
  const simulation = req.body.simulation
  const userId = req.body.userId

  if (!groupName) {
    return res.status(404).send('Error. A group name must be provided.')
  }

  if (!administratorEmail) {
    return res.status(404).send('Error. An email must be provided.')
  }

  try {
    // Get user document or create a new one
    const userDocument = await getUserDocument({
      email: administratorEmail,
      name: administratorName,
      userId,
    })

    if (!userDocument) {
      return res.status(404).send('Error while searching for user.')
    }

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

    // Create a new Simulation document but what happens if the user already has one?
    // this brings up the risk of creating duplicate simulations
    const groupCreated = new Group({
      name: groupName,
      emoji: groupEmoji,
      administrator: {
        name: administratorName,
        email: administratorEmail,
        userId,
      },
      participants: [
        {
          name: administratorName,
          email: administratorEmail,
          userId,
          simulation: simulationSaved._id,
        },
      ],
    })

    const groupSaved = await groupCreated.save()

    // Update the user document
    if (!userDocument.groups) {
      userDocument.groups = []
    }

    userDocument.groups.push(groupSaved._id)

    await userDocument.save()

    simulationSaved.group = groupSaved._id

    await simulationSaved.save()

    // Send response
    setSuccessfulJSONResponse(res)

    res.json(groupSaved)

    console.log('New group created: ', groupName)
  } catch (error) {
    return res.status(401).send('Error while creating group.')
  }
})

export default router
