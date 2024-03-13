import { UserType } from './../../schemas/UserSchema'
import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { createOrUpdateUser } from '../../helpers/queries/createOrUpdateUser'
import { findPollBySlug } from '../../helpers/organisations/findPollBySlug'
import { findGroupById } from '../../helpers/groups/findGroupById'
import { createOrUpdateSimulation } from '../../helpers/queries/createOrUpdateSimulation'
import { SimulationType } from '../../schemas/SimulationSchema'
import { PollType } from '../../schemas/PollSchema'
import { Document } from 'mongoose'
import { handleUpdatePoll } from '../../helpers/organisations/handleUpdatePoll'
import { handleUpdateGroup } from '../../helpers/groups/handleUpdateGroup'
import { GroupType } from '../../schemas/GroupSchema'
import { sendSimulationEmail } from '../../helpers/email/sendSimulationEmail'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulation = req.body.simulation
  const name = req.body.name
  const email = req.body.email
  const userId = req.body.userId
  const shouldSendSimulationEmail = req.body.shouldSendSimulationEmail

  // We need the origin to send the group email (if applicable) with the correct links
  const origin = req.get('origin') ?? 'https://nosgestesclimat.fr'

  // If no simulation is provided, we return an error
  if (!simulation) {
    return res.status(500).send('Error. A simulation must be provided.')
  }

  // We create or search for the user
  const userDocument = await createOrUpdateUser({
    email,
    name,
    userId,
  })

  // If there is no user found or created, we return an error
  if (!userDocument) {
    return res
      .status(500)
      .send('Error while creating or searching for the user.')
  }

  try {
    // We check if a poll is associated with the simulation
    const poll = await findPollBySlug(simulation.poll)

    // We check if a group is associated with the simulation
    const group = await findGroupById(simulation.group)

    const simulationObject: SimulationType = {
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
    }

    // We create or update the simulation
    const simulationSaved = await createOrUpdateSimulation(simulationObject)

    // If a poll is associated with the simulation and the simulation is not already in it
    // we add or update the simulation to the poll
    await handleUpdatePoll({
      poll,
      simulationSaved,
      email,
    } as unknown as {
      poll: Document<PollType> & PollType
      simulationSaved: Document<SimulationType> & SimulationType
      email: string
    })

    // If a group is associated with the simulation and the simulation is not already in it
    // we add the simulation to the group (and send an email to the user)
    await handleUpdateGroup({
      group,
      userDocument,
      simulationSaved,
      origin,
    } as unknown as {
      group: Document<GroupType> & GroupType
      userDocument: Document<UserType> & UserType
      simulationSaved: Document<SimulationType> & SimulationType
      origin: string
    })

    await sendSimulationEmail({
      userDocument,
      simulationSaved,
      shouldSendSimulationEmail,
      origin,
    } as unknown as {
      userDocument: Document<UserType> & UserType
      simulationSaved: Document<SimulationType> & SimulationType
      shouldSendSimulationEmail: boolean
      origin: string
    })

    setSuccessfulJSONResponse(res)

    res.json(simulationSaved)

    console.log(`Simulation created: ${simulationSaved._id}`)
  } catch (error) {
    return res.status(401).send('Error while creating simulation.')
  }
})

export default router