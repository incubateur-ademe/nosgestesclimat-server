import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { getUserDocument } from '../../helpers/queries/getUserDocument'
import { findPollBySlug } from '../../helpers/organisations/findPollBySlug'
import { createOrUpdateSimulation } from '../../helpers/queries/createOrUpdateSimulation'

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
  const userDocument = await getUserDocument({
    email,
    name,
    userId,
  })

  if (!userDocument) {
    return res.status(404).send('Error while searching for user.')
  }

  try {
    // We check if a poll is associated with the simulation
    const poll = await findPollBySlug(simulation.poll)

    // We create or update the simulation
    const simulationSaved = await createOrUpdateSimulation({
      id: simulation.id,
      user: userDocument._id,
      actionChoices: simulation.actionChoices,
      date: simulation.date,
      foldedSteps: simulation.foldedSteps,
      situation: simulation.situation,
      computedResults: simulation.computedResults,
      progression: simulation.progression,
      poll: poll?._id,
      group: simulation.group,
      defaultAdditionalQuestionsAnswers:
        simulation.defaultAdditionalQuestionsAnswers,
    })

    // if a poll is associated with the simulation and the simulation is not already in it, we add it , we add the simulation to the poll
    if (poll && !poll.simulations.includes(simulationSaved._id)) {
      poll.simulations.push(simulationSaved._id)
      await poll.save()
      console.log(`Simulation saved in poll ${poll.slug}.`)
    }

    setSuccessfulJSONResponse(res)

    res.json(simulationSaved)
  } catch (error) {
    console.error(error)
    return res.status(401).send('Error while creating simulation.')
  }
})

export default router
