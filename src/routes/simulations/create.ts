import express from 'express'
import { Document } from 'mongoose'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { sendSimulationEmail } from '../../helpers/email/sendSimulationEmail'
import { findGroupsById } from '../../helpers/groups/findGroupsById'
import { handleUpdateGroup } from '../../helpers/groups/handleUpdateGroup'
import { findPollsBySlug } from '../../helpers/organisations/findPollsBySlug'
import { handleUpdatePoll } from '../../helpers/organisations/handleUpdatePoll'
import { createOrUpdateSimulation } from '../../helpers/queries/createOrUpdateSimulation'
import { createOrUpdateUser } from '../../helpers/queries/createOrUpdateUser'
import { GroupType } from '../../schemas/GroupSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { validateEmail } from '../../utils/validation/validateEmail'
import { UserType } from './../../schemas/UserSchema'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulation = req.body.simulation
  const name = req.body.name
  const email = req.body.email?.toLowerCase()
  const userId = req.body.userId
  const shouldSendSimulationEmail = req.body.shouldSendSimulationEmail
  const listIds = req.body.listIds

  // We need the origin to send the group email (if applicable) with the correct links
  const origin = req.get('origin') ?? 'https://nosgestesclimat.fr'

  // If no simulation is provided, we return an error
  if (!simulation) {
    console.log('No simulation provided.')
    return res.status(500).send('Error. A simulation must be provided.')
  }

  if (!email || !validateEmail(email)) {
    return res
      .status(500)
      .send('Error. A valid email address must be provided.')
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
    // None-blocking call to create or update the contact
    createOrUpdateContact({
      email,
      userId,
      simulation,
      listIds: listIds ?? undefined,
    }).catch((error) => {
      console.log('Error while creating or updating contact:', error)
    })

    // We check if a poll is associated with the simulation
    const polls = await findPollsBySlug(simulation.polls)

    // We check if a group is associated with the simulation
    const groups = await findGroupsById(simulation.groups)

    const simulationObject = {
      id: simulation.id,
      user: userDocument._id,
      actionChoices: {
        ...(simulation?.actionChoices ?? {}),
      },
      date: new Date(simulation.date),
      foldedSteps: [...(simulation.foldedSteps ?? {})],
      situation: {
        ...(simulation.situation ?? {}),
      },
      computedResults: { ...(simulation.computedResults ?? {}) },
      progression: simulation.progression,
      savedViaEmail: simulation.savedViaEmail,
      polls: polls?.map((poll) => poll._id),
      groups: [...(simulation.groups ?? [])],
      defaultAdditionalQuestionsAnswers: {
        ...(simulation.defaultAdditionalQuestionsAnswers ?? {}),
      },
      customAdditionalQuestionsAnswers: {
        ...(simulation.customAdditionalQuestionsAnswers ?? {}),
      },
    }

    // We create or update the simulation
    const simulationSaved = await createOrUpdateSimulation(simulationObject)

    // If on or multiple polls are associated with the simulation and the simulation is not already in it
    // we add or update the simulation to the poll
    for (const poll of polls) {
      await handleUpdatePoll({
        poll,
        simulationSaved,
        email,
      })
    }

    // If on or multiple groups are associated with the simulation and the simulation is not already in it
    // we add the simulation to the group (and send an email to the user)
    for (const group of groups) {
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
    }

    sendSimulationEmail({
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
    return res.status(500).send('Error while creating simulation.')
  }
})

export default router
