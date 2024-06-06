import axios from 'axios'
import { axiosConf } from '../../constants/axios'
import { UserType } from '../../schemas/UserSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import { Document } from 'mongoose'
import { createOrUpdateContact } from './createOrUpdateContact'
import {
  LIST_SUBSCRIBED_END_SIMULATION,
  LIST_SUBSCRIBED_UNFINISHED_SIMULATION,
  TEMPLATE_SIMULATION_COMPLETED,
  TEMPLATE_SIMULATION_IN_PROGRESS,
} from '../../constants/brevo'
import { validateEmail } from '../../utils/validation/validateEmail'

/**
 * Send an email to a user when they save a simulation at the end
 */

type Props = {
  userDocument: Document<UserType> & UserType
  simulationSaved: Document<SimulationType> & SimulationType
  shouldSendSimulationEmail: boolean
  origin: string
}
export async function sendSimulationEmail({
  userDocument,
  simulationSaved,
  shouldSendSimulationEmail,
  origin,
}: Props) {
  const { email, userId } = userDocument

  // If no email is provided, we don't do anything
  if (!email) {
    return
  }

  // If we should not send the email, we don't do anything
  if (!shouldSendSimulationEmail) {
    return
  }

  if (!validateEmail(email)) {
    console.log('Invalid email', email)
    return
  }

  const isSimulationCompleted = simulationSaved.progression === 1

  try {
    // Create or update the contact
    await createOrUpdateContact({
      email,
      userId,
      listIds: [
        isSimulationCompleted
          ? LIST_SUBSCRIBED_END_SIMULATION
          : LIST_SUBSCRIBED_UNFINISHED_SIMULATION,
      ],
      optin: true,
    })

    const SIMULATION_URL = `${origin}/${
      isSimulationCompleted ? 'fin' : 'simulateur/bilan'
    }?sid=${encodeURIComponent(
      simulationSaved.id ?? ''
    )}&mtm_campaign=retrouver-ma-simulation`

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId:
          simulationSaved.progression === 1
            ? TEMPLATE_SIMULATION_COMPLETED
            : TEMPLATE_SIMULATION_IN_PROGRESS,
        params: {
          SHARE_URL: `${origin}?mtm_campaign=partage-email`,
          SIMULATION_URL,
        },
      },
      axiosConf
    )
  } catch (error) {
    throw new Error(error)
  }

  console.log(`Simulation email sent to ${email}`)
}
