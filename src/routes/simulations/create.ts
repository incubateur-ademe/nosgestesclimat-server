import express from 'express'
import type { Document } from 'mongoose'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { sendSimulationEmail } from '../../helpers/email/sendSimulationEmail'
import { findGroupsById } from '../../helpers/groups/findGroupsById'
import { handleUpdateGroup } from '../../helpers/groups/handleUpdateGroup'
import { findPollsBySlug } from '../../helpers/organisations/findPollsBySlug'
import { handleUpdatePoll } from '../../helpers/organisations/handleUpdatePoll'
import type { SimulationCreateObject } from '../../helpers/queries/createOrUpdateSimulation'
import { createOrUpdateSimulation } from '../../helpers/queries/createOrUpdateSimulation'
import { createOrUpdateUser } from '../../helpers/queries/createOrUpdateUser'
import type { SimulationType } from '../../schemas/SimulationSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { validateEmail } from '../../utils/validation/validateEmail'
import type { UserType } from './../../schemas/UserSchema'

const router = express.Router()

router.route('/').post(async (req, res) => {
  const simulation = req.body.simulation
  const name = req.body.name
  const email = formatEmail(req.body.email)
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

  if (email && !validateEmail(email)) {
    return res
      .status(500)
      .send('Error. A valid email address must be provided.')
  }

  let userDocument
  try {
    // We create or search for the user
    userDocument = await createOrUpdateUser({
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
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while creating simulation.')
  }

  // Non-blocking call to create or update the contact
  try {
    await createOrUpdateContact({
      email,
      userId,
      simulation,
      listIds: listIds ?? undefined,
    })
  } catch (error) {
    console.warn(error)
    // We do nothing
  }

  try {
    // We check if a poll is associated with the simulation
    const polls = await findPollsBySlug(simulation.polls)

    // We check if a group is associated with the simulation
    const groups = await findGroupsById(simulation.groups)

    // TODO: Should delete when we launch empreinte eau
    // We format the computed results if it does not contain metrics
    const computedResults = simulation.computedResults?.bilan
      ? { carbone: simulation.computedResults }
      : simulation.computedResults

    const simulationObject: SimulationCreateObject = {
      id: simulation.id,
      user: userDocument._id,
      actionChoices: simulation?.actionChoices ?? {},
      date: simulation.date ? new Date(simulation.date) : new Date(),
      foldedSteps: simulation.foldedSteps ?? [],
      situation: simulation.situation ?? {},
      computedResults,
      progression: simulation.progression,
      savedViaEmail: simulation.savedViaEmail,
      polls: (polls ?? []).map((poll) => poll._id),
      groups: simulation.groups ?? [],
      defaultAdditionalQuestionsAnswers:
        simulation.defaultAdditionalQuestionsAnswers ?? {},
      customAdditionalQuestionsAnswers:
        simulation.customAdditionalQuestionsAnswers ?? {},
    }

    // We create or update the simulation
    const simulationSaved = await createOrUpdateSimulation(
      simulationObject,
      userDocument
    )

    // If on or multiple polls are associated with the simulation and the simulation is not already in it
    // we add or update the simulation to the poll
    for (const poll of polls) {
      await handleUpdatePoll({
        poll,
        simulationSaved,
        email,
        origin,
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
      })
    }

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

    res.json({
      ...simulationSaved.toObject(),
      polls: polls.map(({ slug }) => slug),
    })

    console.log(`Simulation created: ${simulationSaved._id}`)
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while creating simulation.')
  }
})

/**
 * @deprecated should use features/simulations/organisations/groups instead
 */
export default router
