import axios from 'axios'
import { Document } from 'mongoose'
import { axiosConf } from '../../constants/axios'
import {
  LIST_SUBSCRIBED_END_SIMULATION,
  LIST_SUBSCRIBED_UNFINISHED_SIMULATION,
  MATOMO_CAMPAIGN_EMAIL_AUTOMATISE,
  MATOMO_CAMPAIGN_KEY,
  MATOMO_KEYWORD_KEY,
  MATOMO_KEYWORDS,
  TEMPLATE_ID_SIMULATION_COMPLETED,
  TEMPLATE_ID_SIMULATION_IN_PROGRESS,
} from '../../constants/brevo'
import { SimulationType } from '../../schemas/SimulationSchema'
import { UserType } from '../../schemas/UserSchema'
import { createOrUpdateContact } from './createOrUpdateContact'

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

    const templateId = isSimulationCompleted
      ? TEMPLATE_ID_SIMULATION_COMPLETED
      : TEMPLATE_ID_SIMULATION_IN_PROGRESS

    const simulationUrl = new URL(origin)
    simulationUrl.pathname = isSimulationCompleted ? 'fin' : 'simulateur/bilan'
    const { searchParams } = simulationUrl
if (simulationSaved.id) {
    searchParams.append('sid', simulationSaved.id)
}
    searchParams.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
    searchParams.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId])

    await axios.post(
      '/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId,
        params: {
          SIMULATION_URL: simulationUrl.toString(),
        },
      },
      axiosConf
    )
  } catch (error) {
    throw new Error(error)
  }

  console.log(`Simulation email sent to ${email}`)
}
