import { UserType } from './../../schemas/UserSchema'
import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { getUserDocument } from '../../helpers/queries/getUserDocument'
import { findPollBySlug } from '../../helpers/organisations/findPollBySlug'
import { createOrUpdateSimulation } from '../../helpers/queries/createOrUpdateSimulation'
import { SimulationType } from '../../schemas/SimulationSchema'
import { handleUpdateUser } from '../../helpers/organisations/handleUpdateUser'
import { PollType } from '../../schemas/PollSchema'
import { Document } from 'mongoose'
import { handleUpdatePoll } from '../../helpers/organisations/handleUpdatePoll'

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
  let userDocument

  // Only create or try to find a user if an email or a userId is provided
  if (email || userId) {
    userDocument = await getUserDocument({
      email,
      name,
      userId,
    })
  }

  if (!userDocument) {
    return res.status(404).send('Error while searching for user.')
  }

  try {
    // We check if a poll is associated with the simulation
    const poll = await findPollBySlug(simulation.poll)

    const simulationObject: SimulationType = {
      id: simulation.id,
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
    }

    // Link a user object only if it exists
    if (userDocument) {
      simulationObject.user = userDocument._id
    }

    // We create or update the simulation
    const simulationSaved = await createOrUpdateSimulation(simulationObject)

    await handleUpdatePoll({
      poll,
      simulationSaved,
    } as unknown as {
      poll: Document<PollType> & PollType
      simulationSaved: Document<SimulationType> & SimulationType
    })

    // If a poll is associated with the simulation and the simulation is not already in it
    // we add the simulation to the poll
    await handleUpdateUser({
      poll,
      userDocument,
      simulationSaved,
    } as unknown as {
      poll: Document<PollType> & PollType
      userDocument: Document<UserType> & UserType
      simulationSaved: Document<SimulationType> & SimulationType
    })

    setSuccessfulJSONResponse(res)

    res.json(simulationSaved)
  } catch (error) {
    return res.status(401).send('Error while creating simulation.')
  }
})

export default router
